import os
from flask import Flask, request, jsonify, render_template, abort
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
from datetime import datetime
from collections import Counter
from groq import Groq
from dotenv import load_dotenv
import bleach
import re
import logging
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman
import config

# Load environment variables from .env file (for development only)
if os.getenv('FLASK_ENV') == 'development':
    load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(filename='app.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')

# Use ProxyFix to handle reverse proxy headers
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Initialize rate limiter with IP-based limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[config.RATE_LIMIT_DAY, config.RATE_LIMIT_HOUR],
    storage_uri="memory://"
)

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Configure Flask-Talisman with a CSP that allows necessary resources
csp = {
    'default-src': "'self'",
    'script-src': "'self' https://cdnjs.cloudflare.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src': "'self' https://fonts.gstatic.com",
    'img-src': "'self' data:",
    'connect-src': "'self'"
}

Talisman(app, content_security_policy=csp, force_https=True)

def get_db_connection():
    """Create a database connection and return the connection object."""
    conn = sqlite3.connect('whatifdatabase.sqlite')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with necessary tables."""
    with get_db_connection() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS questions
                        (id INTEGER PRIMARY KEY AUTOINCREMENT,
                         user_id TEXT,
                         prompt TEXT,
                         created_at DATETIME,
                         response TEXT,
                         additional_info TEXT)''')
        conn.commit()

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/submit_question', methods=['POST'])
@limiter.limit(config.RATE_LIMIT_MINUTE)
def submit_question():
    """Handle question submission and generate AI response."""
    data = request.json
    question = data.get('question', '')
    
    # Input validation
    if not question or len(question) < 10 or len(question) > 500:
        abort(400, description="Invalid input: Question must be between 10 and 500 characters.")
    
    # Whitelist of allowed characters
    if not re.match(r'^[a-zA-Z0-9\s\.\,\?\!]+$', question):
        abort(400, description="Invalid input: Question contains disallowed characters.")
    
    # Thorough sanitization using bleach
    allowed_tags = []  # No HTML tags allowed
    allowed_attributes = {}  # No attributes allowed
    cleaned_question = bleach.clean(question, tags=allowed_tags, attributes=allowed_attributes, strip=True)
    
    # Additional custom cleaning
    cleaned_question = cleaned_question.replace('\n', ' ').replace('\r', '').strip()
    
    # Prepare the question for the AI model
    prompt = f"""
    Imagine an alternate timeline where {cleaned_question} didn't happen. 
    Provide a response in the following format:

    Scenario: Briefly describe the alternate scenario.

    Consequences:
    - List the first major consequence here.
    - List the second major consequence here.
    - Continue with 1-3 major consequences, each on a new line starting with a dash (-).

    Analysis: Provide a brief analysis of the overall impact of this change on history.
    """

    try:
        response = client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[
                {"role": "system", "content": "You are an AI assistant with expertise in physics, philosophy, and science fiction. Your task is to help users explore and understand the implications of hypothetical time travel scenarios. Provide detailed insights on the potential consequences, paradoxes, and ethical considerations involved in each specific scenario, while maintaining a friendly and engaging conversation. Making it feel like a conversation, not just an AI answering a question. Make it interesting and engaging, and don't be too wordy. You are a historian specializing in alternate history scenarios."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        # Store the question in the database
        with get_db_connection() as conn:
            conn.execute("INSERT INTO questions (prompt, created_at) VALUES (?, ?)", 
                         (cleaned_question, datetime.now()))
            conn.commit()

        return jsonify({'response': response.choices[0].message.content})
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({'error': 'An error occurred while processing your request'}), 500

@app.route('/get_inspiration_questions', methods=['GET'])
@limiter.limit(config.RATE_LIMIT_MINUTE)
def get_inspiration_questions():
    """Fetch and return popular questions for inspiration."""
    try:
        with get_db_connection() as conn:
            questions = conn.execute("SELECT prompt, COUNT(*) as count FROM questions GROUP BY prompt ORDER BY count DESC LIMIT 20").fetchall()
        
        formatted_questions = [{"text": q['prompt'], "count": q['count']} for q in questions]
        
        return jsonify({'questions': formatted_questions})
    except Exception as e:
        app.logger.error(f"Error fetching inspiration questions: {str(e)}")
        abort(500, description="An error occurred while fetching inspiration questions")

@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit exceeded errors."""
    return jsonify(error="Rate limit exceeded. Please try again later."), 429

@app.errorhandler(400)
def bad_request_handler(e):
    """Handle bad request errors."""
    return jsonify(error=str(e.description)), 400

@app.errorhandler(500)
def internal_server_error_handler(e):
    """Handle internal server errors."""
    return jsonify(error="An internal server error occurred."), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=False, ssl_context='adhoc')  # Use 'adhoc' for development HTTPS