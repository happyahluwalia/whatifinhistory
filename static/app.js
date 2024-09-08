document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('whatif-input');
    const submitBtn = document.getElementById('submit-btn');
    const loadingAnimation = document.getElementById('loading-animation');
    const responseContainer = document.getElementById('response-container');
    const inspirationQuestions = document.getElementById('inspiration-questions');
    const questionBubbles = document.querySelectorAll('.question-bubble');

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    });

    // Add click event listeners to question bubbles
    questionBubbles.forEach(bubble => {
        bubble.addEventListener('click', () => {
            const question = bubble.getAttribute('data-question');
            input.value = question;
            input.focus();
        });
    });

    function handleSubmit() {
        const question = input.value.trim();
        if (question) {
            input.disabled = true;
            submitBtn.disabled = true;
            showLoadingAnimation();
            document.getElementById('share-btn').classList.add('hidden');  // Hide share button

            fetch('/submit_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: question }),
            })
            .then(response => response.json())
            .then(data => {
                hideLoadingAnimation();
                showResponse(data.response);
                input.disabled = false;
                submitBtn.disabled = false;
                input.value = '';
                fetchInspirationQuestions(); // Refresh inspiration questions after submission
            })
            .catch(error => {
                console.error('Error:', error);
                hideLoadingAnimation();
                showResponse('An error occurred. Please try again.');
                input.disabled = false;
                submitBtn.disabled = false;
            });
        }
    }

    function showLoadingAnimation() {
        loadingAnimation.classList.remove('hidden');
    }

    function hideLoadingAnimation() {
        loadingAnimation.classList.add('hidden');
    }

    function showResponse(response) {
        const responseSection = document.getElementById('response-section');
        const scenarioContent = document.getElementById('scenario-content');
        const consequencesTimeline = document.getElementById('consequences-timeline');
        const analysisContent = document.getElementById('analysis-content');
        const shareBtn = document.getElementById('share-btn');

        const parsedResponse = parseResponse(response);

        // Populate scenario
        scenarioContent.textContent = parsedResponse.scenario;

        // Populate consequences
        consequencesTimeline.innerHTML = '';
        parsedResponse.consequences.forEach((consequence, index) => {
            const eventElement = document.createElement('div');
            eventElement.className = 'consequence-event';
            eventElement.innerHTML = `
                <h4>Consequence ${index + 1}</h4>
                <p>${consequence}</p>
            `;
            consequencesTimeline.appendChild(eventElement);

            // Add a fade-in animation
            setTimeout(() => {
                eventElement.style.opacity = '1';
            }, index * 200);
        });

        // Populate analysis
        analysisContent.textContent = parsedResponse.analysis;

        responseSection.classList.remove('hidden');
        shareBtn.classList.remove('hidden');
    }

    function parseResponse(response) {
        const sections = response.split('\n\n');
        let scenario = '';
        let consequences = [];
        let analysis = '';

        // Parse Scenario
        if (sections[0].startsWith('Scenario:')) {
            scenario = sections[0].replace('Scenario:', '').trim();
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

    function fetchInspirationQuestions() {
        fetch('/get_inspiration_questions')
            .then(response => response.json())
            .then(data => {
                displayInspirationQuestions(data.questions);
            })
            .catch(error => console.error('Error:', error));
    }

    function displayInspirationQuestions(questions) {
        inspirationQuestions.innerHTML = '';
        questions.forEach(question => {
            const element = document.createElement('div');
            element.classList.add('inspiration-question');
            const questionText = question.text.replace('What if ', '').replace(' happened?', '');
            element.innerHTML = `
                ${questionText}
                <span class="question-count">${question.count}</span>
            `;
            element.addEventListener('click', () => {
                input.value = questionText;
            });
            inspirationQuestions.appendChild(element);
        });
    }

    function animateInspirationQuestions() {
        const questions = document.querySelectorAll('.inspiration-question');
        questions.forEach((question, index) => {
            setTimeout(() => {
                question.style.opacity = '0';
                setTimeout(() => {
                    question.style.opacity = '1';
                }, 500);
            }, index * 1000);
        });
    }

    function handleShare() {
        const questionText = input.value;
        const shareText = `I asked "What if ${questionText} didn't happen?" on Whatif in History. Check it out!`;
        if (navigator.share) {
            navigator.share({
                title: 'Whatif in History',
                text: shareText,
                url: window.location.href,
            }).then(() => console.log('Successful share'))
            .catch((error) => console.log('Error sharing:', error));
        } else {
            alert('Sharing is not supported on this browser. You can copy this text:\n\n' + shareText);
        }
    }
    
    document.getElementById('share-btn').addEventListener('click', handleShare);

    setInterval(animateInspirationQuestions, 5000);

    // Initial fetch of inspiration questions
    fetchInspirationQuestions();
});