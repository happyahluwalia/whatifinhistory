import requests
import time

BASE_URL = 'http://localhost:5000'  # Adjust if your server is running on a different port

def test_rate_limit():
    for i in range(10):  # Try to make 10 requests
        response = requests.post(f'{BASE_URL}/submit_question', json={'question': 'Test question'})
        print(f'Request {i+1}: Status Code: {response.status_code}, Response: {response.text}')
        if response.status_code == 429:  # Too Many Requests
            print(f'Rate limit hit after {i+1} requests')
            break
        time.sleep(0.5)  # Wait half a second between requests

if __name__ == '__main__':
    test_rate_limit()
