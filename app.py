from flask import Flask, request, jsonify, render_template, abort
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
from datetime import datetime
from collections import Counter
import os
from groq import Groq
from dotenv import load_dotenv
import bleach

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

# Initialize Groq client
client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

def init_db():
    conn = sqlite3.connect('whatifdatabase.sqlite')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS questions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  prompt TEXT,
                  created_at DATETIME,
                  response TEXT,
                  additional_info TEXT)''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit_question', methods=['POST'])
@limiter.limit("5 per minute")
def submit_question():
    data = request.json
    question = data.get('question')
    
    if not question or len(question) > 500:
        abort(400, description="Invalid input")
    
    # Thorough sanitization using bleach
    allowed_tags = []  # No HTML tags allowed
    allowed_attributes = {}  # No attributes allowed
    cleaned_question = bleach.clean(question, tags=allowed_tags, attributes=allowed_attributes, strip=True)
    
    # Additional custom cleaning if needed
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

    response = client.chat.completions.create(
        model="mixtral-8x7b-32768",
        messages=[
            {"role": "system", "content": "You are a historian specializing in alternate history scenarios."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1000,
        temperature=0.7
    )

    return jsonify({'response': response.choices[0].message.content})

@app.route('/get_background_questions', methods=['GET'])
def get_background_questions():
    conn = sqlite3.connect('whatifdatabase.sqlite')
    c = conn.cursor()
    c.execute("SELECT prompt FROM questions ORDER BY RANDOM() LIMIT 20")
    questions = [row[0] for row in c.fetchall()]
    conn.close()
    
    return jsonify({'questions': questions})

@app.route('/get_inspiration_questions', methods=['GET'])
@limiter.limit("10 per minute")
def get_inspiration_questions():
    conn = sqlite3.connect('whatifdatabase.sqlite')
    c = conn.cursor()
    c.execute("SELECT prompt FROM questions")
    all_questions = [row[0] for row in c.fetchall()]
    conn.close()
    
    # Count occurrences of each question
    question_counts = Counter(all_questions)
    
    # Sort questions by count (popularity) in descending order
    sorted_questions = sorted(question_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Take the top 20 questions
    top_questions = sorted_questions[:20]
    
    # Format the questions with their counts
    formatted_questions = [{"text": q, "count": c} for q, c in top_questions]
    
    return jsonify({'questions': formatted_questions})

if __name__ == '__main__':
    init_db()
    app.run(debug=False)  # Set debug to False in production
