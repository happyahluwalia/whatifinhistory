# Whatif in History

Whatif in History is an interactive web application that allows users to explore hypothetical scenarios in history. Users can ask "What if" questions about historical events, and the application provides AI-generated responses to these scenarios.

## Features

- Ask "What if" questions about historical events
- Receive AI-generated responses to hypothetical scenarios
- View inspiration questions from other users
- Rate limiting to prevent system overload
- Input validation and sanitization
- Secure headers and content security policy
- Error handling and logging

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Python with Flask
- Database: SQLite
- AI Integration: Groq API
- Additional Libraries: Flask-Limiter, Flask-Talisman, Bleach

## Setup

1. Clone the repository
2. Install the required Python packages: `pip install -r requirements.txt`
3. Set up your environment variables in a `.env` file:
   - `GROQ_API_KEY`: Your Groq API key
   - `FLASK_ENV`: Set to 'development' for local development
4. Create a `config.py` file with the following settings:
   - `RATE_LIMIT_MINUTE`: Rate limit per minute (e.g., "1 per minute")
   - `RATE_LIMIT_HOUR`: Rate limit per hour (e.g., "10 per hour")
   - `RATE_LIMIT_DAY`: Rate limit per day (e.g., "100 per day")
5. Run the Flask application: `python app.py`

## Security Measures

- Rate limiting to prevent abuse
- Input validation and sanitization to prevent XSS attacks
- Content Security Policy (CSP) implemented using Flask-Talisman
- HTTPS enforced in production
- Secure headers set for enhanced security

## Development

- Use the `tests/rate_limiter_test.py` script to test rate limiting functionality
- Ensure all environment variables are set in the `.env` file
- Run the application in debug mode during development

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).
