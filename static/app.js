document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('whatif-input');
    const submitBtn = document.getElementById('submit-btn');
    const loadingAnimation = document.getElementById('loading-animation');
    const responseContainer = document.getElementById('response-container');
    const inspirationQuestions = document.getElementById('inspiration-questions');

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
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
        responseContainer.innerHTML = `<p>${response}</p>`;
        responseContainer.classList.remove('hidden');
        document.getElementById('share-btn').classList.remove('hidden');
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