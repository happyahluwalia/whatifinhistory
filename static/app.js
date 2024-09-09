document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('questionInput');
    const submitBtn = document.querySelector('#questionForm button[type="submit"]');
    const loadingAnimation = document.getElementById('loading-animation');

    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        });
    }

    // Add event listeners to question bubbles
    const questionBubbles = document.querySelectorAll('.question-bubble');
    questionBubbles.forEach(bubble => {
        bubble.addEventListener('click', () => {
            const question = bubble.getAttribute('data-question');
            input.value = question;
            input.focus();
        });
    });

    function fetchInspirationQuestions() {
        fetch('/get_inspiration_questions')
            .then(response => response.json())
            .then(data => {
                const inspirationContainer = document.getElementById('inspiration-questions');
                inspirationContainer.innerHTML = '';
                
                data.questions.forEach(questionObj => {
                    const questionElement = document.createElement('div');
                    questionElement.className = 'inspiration-question';
                    questionElement.textContent = questionObj.text;
                    
                    const countElement = document.createElement('span');
                    countElement.className = 'question-count';
                    countElement.textContent = questionObj.count;
                    
                    questionElement.appendChild(countElement);
                    
                    questionElement.addEventListener('click', () => {
                        document.getElementById('questionInput').value = questionObj.text;
                    });
                    
                    inspirationContainer.appendChild(questionElement);
                });
            })
            .catch(error => console.error('Error fetching inspiration questions:', error));
    }

    fetchInspirationQuestions();

    function showLoadingAnimation() {
        document.getElementById('loading-animation').classList.add('show');
        document.getElementById('question-section').classList.add('hidden');
    }

    function hideLoadingAnimation() {
        document.getElementById('loading-animation').classList.remove('show');
        document.getElementById('question-section').classList.remove('hidden');
    }

    function handleSubmit(e) {
        if (e) e.preventDefault();
        
        const input = document.getElementById('questionInput');
        if (!input) {
            console.error('Question input not found');
            return;
        }
        
        const question = input.value.trim();
        if (!question) {
            console.error('Question is empty');
            return;
        }
        
        showLoadingAnimation();
        
        fetch('/submit_question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: question }),
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
                }
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            hideLoadingAnimation();
            if (data.response) {
                displayResponse(data.response);
            } else {
                throw new Error('Invalid response from server');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            hideLoadingAnimation();
            displayErrorMessage(error.message);
        });
    }

    function displayResponse(response) {
        const responseSection = document.getElementById('response-section');
        const questionSection = document.getElementById('question-section');
        if (!responseSection || !questionSection) {
            console.error('Response or question section not found');
            return;
        }
        
        const parsedResponse = parseResponse(response);
        
        // Clear previous content
        responseSection.innerHTML = '';
        
        if (parsedResponse.scenario) {
            const scenarioSection = createSection('Scenario', parsedResponse.scenario);
            responseSection.appendChild(scenarioSection);
        }
        
        if (parsedResponse.consequences && parsedResponse.consequences.length > 0) {
            const consequencesSection = createSection('Consequences', null);
            const consequencesList = document.createElement('ul');
            parsedResponse.consequences.forEach(consequence => {
                const li = document.createElement('li');
                li.textContent = consequence;
                consequencesList.appendChild(li);
            });
            consequencesSection.appendChild(consequencesList);
            responseSection.appendChild(consequencesSection);
        }
        
        if (parsedResponse.analysis) {
            const analysisSection = createSection('Analysis', parsedResponse.analysis);
            responseSection.appendChild(analysisSection);
        }
        
        // If no sections were added, display the raw response
        if (responseSection.children.length === 0) {
            const rawResponseSection = createSection('Response', response);
            responseSection.appendChild(rawResponseSection);
        }
        
        // Add animations
        animateSections();
        
        responseSection.classList.remove('hidden');
        questionSection.classList.remove('hidden');
        
        addNewQuestionButton();
    }

    function createSection(title, content) {
        const section = document.createElement('div');
        section.className = 'response-section';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        section.appendChild(titleElement);
        
        if (content) {
            const contentElement = document.createElement('p');
            contentElement.textContent = content;
            section.appendChild(contentElement);
        }
        
        return section;
    }

    function animateSections() {
        const sections = document.querySelectorAll('.response-section');
        sections.forEach((section, index) => {
            section.style.animation = `fadeInUp 0.5s ease-out ${index * 0.2}s forwards`;
            section.style.opacity = '0';
        });
    }

    function parseResponse(response) {
        if (typeof response !== 'string') {
            console.error('Response is not a string:', response);
            return { rawResponse: JSON.stringify(response) };
        }
        
        const sections = response.split('\n\n');
        const parsed = {
            scenario: '',
            consequences: [],
            analysis: ''
        };
        
        sections.forEach(section => {
            if (section.startsWith('Scenario:')) {
                parsed.scenario = section.replace('Scenario:', '').trim();
            } else if (section.startsWith('Consequences:')) {
                parsed.consequences = section.split('\n').slice(1).map(c => c.replace(/^-\s*/, '').trim());
            } else if (section.startsWith('Analysis:')) {
                parsed.analysis = section.replace('Analysis:', '').trim();
            }
        });
        
        return parsed;
    }

    function addNewQuestionButton() {
        const button = document.createElement('button');
        button.textContent = 'Ask Another Question';
        button.className = 'new-question-btn';
        button.addEventListener('click', () => {
            document.getElementById('response-section').classList.add('hidden');
            document.getElementById('questionInput').value = '';
            document.getElementById('questionInput').focus();
        });
        document.getElementById('response-section').appendChild(button);
    }
});

document.getElementById('questionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const question = document.getElementById('questionInput').value;
    const validationMessage = document.getElementById('validationMessage');
    
    // Clear previous validation message
    validationMessage.textContent = '';
    
    // Validate question length
    if (question.length < 10 || question.length > 500) {
        validationMessage.textContent = 'Question must be between 10 and 500 characters.';
        return;
    }
    
    // Validate allowed characters using regex
    const allowedCharsRegex = /^[a-zA-Z0-9\s\.\,\?\!]+$/;
    if (!allowedCharsRegex.test(question)) {
        validationMessage.textContent = 'Question contains disallowed characters.';
        return;
    }
    
    // If validation passes, submit the form
    submitQuestion(question);
});

function submitQuestion(question) {
    // Your existing AJAX call to submit the question
    fetch('/submit_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question }),
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response
        console.log(data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function displayErrorMessage(message) {
    const errorElement = document.getElementById('error-message');
    if (!errorElement) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.color = 'red';
        errorDiv.style.marginTop = '10px';
        document.getElementById('question-section').appendChild(errorDiv);
    }
    document.getElementById('error-message').textContent = message;
}