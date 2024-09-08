document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('whatif-input');
    const submitBtn = document.getElementById('submit-btn');
    const loadingAnimation = document.getElementById('loading-animation');

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    });

    function fetchInspirationQuestions() {
        fetch('/get_inspiration_questions')
            .then(response => response.json())
            .then(data => {
                console.log('Inspiration data received:', data);
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
                        document.getElementById('whatif-input').value = questionObj.text;
                    });
                    
                    inspirationContainer.appendChild(questionElement);
                });
            })
            .catch(error => console.error('Error fetching inspiration questions:', error));
    }

    fetchInspirationQuestions();

    function showLoadingAnimation() {
        loadingAnimation.classList.add('show');
    }

    function hideLoadingAnimation() {
        loadingAnimation.classList.remove('show');
    }

    function handleSubmit() {
        const question = document.getElementById('whatif-input').value.trim();
        if (question) {
            document.getElementById('whatif-input').disabled = true;
            document.getElementById('submit-btn').disabled = true;
            showLoadingAnimation();
            document.getElementById('response-section').classList.add('hidden');

            fetch('/submit_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: question }),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Data received from server:', data);
                const minimumLoadingTime = 3000;
                const loadingStartTime = Date.now();
                const remainingLoadingTime = Math.max(0, minimumLoadingTime - (Date.now() - loadingStartTime));

                setTimeout(() => {
                    hideLoadingAnimation();
                    if (data && data.response) {
                        showResponse(data.response);
                    } else {
                        showResponse('Error: No response received from server.');
                    }
                    document.getElementById('whatif-input').disabled = false;
                    document.getElementById('submit-btn').disabled = false;
                    document.getElementById('whatif-input').value = '';
                }, remainingLoadingTime);
            })
            .catch(error => {
                console.error('Error:', error);
                hideLoadingAnimation();
                showResponse('An error occurred. Please try again.');
                document.getElementById('whatif-input').disabled = false;
                document.getElementById('submit-btn').disabled = false;
            });
        }
    }

    function showResponse(response) {
        console.log('Raw response:', response);
        const responseSection = document.getElementById('response-section');
        const scenarioContent = document.getElementById('scenario-content');
        const consequencesTimeline = document.getElementById('consequences-timeline');
        const analysisContent = document.getElementById('analysis-content');
        const shareBtn = document.getElementById('share-btn');

        const parsedResponse = parseResponse(response);
        console.log('Parsed response:', parsedResponse);

        if (!parsedResponse || !parsedResponse.scenario) {
            scenarioContent.textContent = 'Error: Unable to parse the response. Please try again.';
            consequencesTimeline.innerHTML = '';
            analysisContent.textContent = '';
        } else {
            scenarioContent.textContent = parsedResponse.scenario;

            consequencesTimeline.innerHTML = '';
            parsedResponse.consequences.forEach((consequence, index) => {
                const eventElement = document.createElement('div');
                eventElement.className = 'consequence-event';
                eventElement.innerHTML = `
                    <h4>Consequence ${index + 1}</h4>
                    <p>${consequence}</p>
                `;
                consequencesTimeline.appendChild(eventElement);
            });

            analysisContent.textContent = parsedResponse.analysis;
        }

        responseSection.classList.remove('hidden');
        shareBtn.classList.remove('hidden');
    }

    function parseResponse(response) {
        console.log('Parsing response:', response);
        
        if (typeof response !== 'string') {
            console.error('Response is not a string:', response);
            return { scenario: 'Error parsing response', consequences: [], analysis: 'Please try again.' };
        }

        const sections = response.split('\n\n');
        let scenario = '';
        let consequences = [];
        let analysis = '';

        // Parse Scenario
        const scenarioSection = sections.find(section => section.startsWith('Scenario:'));
        if (scenarioSection) {
            scenario = scenarioSection.replace('Scenario:', '').trim();
        }

        // Parse Consequences
        const consequencesSection = sections.find(section => section.startsWith('Consequences:'));
        if (consequencesSection) {
            const consequenceLines = consequencesSection.split('\n');
            consequences = consequenceLines
                .slice(1) // Skip the "Consequences:" header
                .filter(line => line.trim() !== '')
                .map(line => line.startsWith('- ') ? line.slice(2) : line);
        }

        // Parse Analysis
        const analysisSection = sections.find(section => section.startsWith('Analysis:'));
        if (analysisSection) {
            analysis = analysisSection.replace('Analysis:', '').trim();
        }

        return { scenario, consequences, analysis };
    }
});