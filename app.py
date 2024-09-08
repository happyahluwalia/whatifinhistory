from flask import Flask, request, jsonify, render_template
import sqlite3
from datetime import datetime
from collections import Counter
import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

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
def submit_question():
    data = request.json
    question = data.get('question')
    
    # Prepare the question for the AI model
    ai_question = f"What if {question} happened?"
    
    # Make the API call
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are an AI assistant with expertise in physics, philosophy, and science fiction. Your task is to help users explore and understand the implications of hypothetical time travel scenarios. Provide detailed insights on the potential consequences, paradoxes, and ethical considerations involved in each specific scenario, while maintaining a friendly and engaging conversation. Making it feel like a conversation, not just an AI answering a question. Make it interesting and engaging, and don't be too wordy.",
            },
            {
                "role": "user",
                "content": ai_question,
            }
        ],
        model="llama3-8b-8192",
    )
    
    # Extract the response
    response = chat_completion.choices[0].message.content
    
    # Store in database
    conn = sqlite3.connect('whatifdatabase.sqlite')
    c = conn.cursor()
    c.execute("INSERT INTO questions (user_id, prompt, created_at, response, additional_info) VALUES (?, ?, ?, ?, ?)",
              ('1', ai_question, datetime.now(), response, None))
    conn.commit()
    conn.close()
    
    return jsonify({'response': response})

@app.route('/get_background_questions', methods=['GET'])
def get_background_questions():
    conn = sqlite3.connect('whatifdatabase.sqlite')
    c = conn.cursor()
    c.execute("SELECT prompt FROM questions ORDER BY RANDOM() LIMIT 20")
    questions = [row[0] for row in c.fetchall()]
    conn.close()
    
    return jsonify({'questions': questions})

@app.route('/get_inspiration_questions', methods=['GET'])
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
    app.run(debug=True)
