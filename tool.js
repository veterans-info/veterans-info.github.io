document.addEventListener('DOMContentLoaded', function() {
    const toolSection = document.getElementById('interactive-tool');
    let currentQuestionIndex = 0;
    let userAnswers = [];

    const questions = [
        {
            id: 'q1',
            question: "Are you a veteran who served on active duty in the U.S. Armed Forces?",
            options: [
                { text: "Yes", next: 'q2' },
                { text: "No", next: 'result-non-veteran' }
            ]
        },
        {
            id: 'q2',
            question: "Did you serve during a war, in a campaign or expedition for which a campaign badge has been authorized, or are you a disabled veteran?",
            options: [
                { text: "Yes", next: 'q3-preference-type' }, // New question for preference type
                { text: "No", next: 'result-no-preference' }
            ]
        },
        {
            id: 'q3-preference-type',
            question: "Which of the following best describes your service or status?",
            options: [
                { text: "Served during a war or in a campaign/expedition (non-disabled)", next: 'result-5-point' },
                { text: "Disabled veteran (10% or more disability)", next: 'q4-10-point-type' }, // Further questions for 10-point
                { text: "Purple Heart recipient", next: 'result-10-point-ph' }
            ]
        },
        {
            id: 'q4-10-point-type',
            question: "What is your disability rating or status?",
            options: [
                { text: "10% or more, but less than 30%", next: 'result-10-point-cp' },
                { text: "30% or more", next: 'result-10-point-cps' },
                { text: "Compensably disabled, but not 30% or more (e.g., XP)", next: 'result-10-point-xp' }
            ]
        }
        // More questions will be added here for derivative preference, RIF, etc.
    ];

    function displayQuestion() {
        if (currentQuestionIndex < questions.length) {
            const q = questions[currentQuestionIndex];
            let html = `<h2>${q.question}</h2><div class="options">`;
            q.options.forEach((option, index) => {
                html += `<button data-next="${option.next}" data-answer-index="${index}">${option.text}</button>`;
            });
            html += `</div>`;
            toolSection.innerHTML = html;

            toolSection.querySelectorAll('.options button').forEach(button => {
                button.addEventListener('click', handleAnswer);
            });

            // Add Go Back button if not the first question
            if (currentQuestionIndex > 0) {
                toolSection.innerHTML += `<button id="goBackBtn">Go Back</button>`;
                document.getElementById('goBackBtn').addEventListener('click', goBack);
            }
        } else {
            // If all questions are answered and no specific result was triggered,
            // it means the path is incomplete or leads to a complex scenario.
            displayResults('incomplete-path');
        }
    }

    function handleAnswer(event) {
        const selectedOptionIndex = event.target.dataset.answerIndex;
        const nextStep = event.target.dataset.next;

        userAnswers[currentQuestionIndex] = {
            questionId: questions[currentQuestionIndex].id,
            answer: questions[currentQuestionIndex].options[selectedOptionIndex].text,
            next: nextStep
        };

        if (nextStep.startsWith('result-')) {
            displayResults(nextStep);
        } else {
            // Find the index of the next question
            const nextQuestionObj = questions.find(q => q.id === nextStep);
            if (nextQuestionObj) {
                currentQuestionIndex = questions.indexOf(nextQuestionObj);
                displayQuestion();
            } else {
                // Fallback if next question not found (shouldn't happen with correct setup)
                displayResults('error');
            }
        }
    }

    function displayResults(resultType) {
        let html = `<h2>Your Assessment Results</h2>`;
        switch (resultType) {
            case 'result-non-veteran':
                html += `<p>Based on your answers, you are not a veteran who served on active duty. Therefore, you are generally not eligible for Veterans' Preference.</p>`;
                html += `<p>For more information, please refer to the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-1/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 1: Basic Eligibility Requirements</a>.</p>`;
                break;
            case 'result-no-preference':
                html += `<p>Based on your answers, while you are a veteran, your service may not meet the specific criteria for Veterans' Preference (e.g., service during a war, campaign, or as a disabled veteran).</p>`;
                html += `<p>For detailed eligibility criteria, please refer to the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-1/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 1: Basic Eligibility Requirements</a>.</p>`;
                break;
            case 'result-5-point':
                html += `<p>Based on your answers, you appear to be eligible for <strong>5-point Veterans' Preference (TP)</strong>.</p>`;
                html += `<p>This preference is generally granted to veterans who served during a war, or in a campaign or expedition for which a campaign badge has been authorized, and who are not disabled.</p>`;
                html += `<p><strong>Required Documentation:</strong> Typically, a DD-214, Certificate of Release or Discharge from Active Duty, showing honorable discharge and qualifying service.</p>`;
                html += `<p>For more details, see the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 2: Types of Preference</a>.</p>`;
                break;
            case 'result-10-point-ph':
                html += `<p>Based on your answers, you appear to be eligible for <strong>10-point Veterans' Preference (PH)</strong> as a Purple Heart recipient.</p>`;
                html += `<p><strong>Required Documentation:</strong> Typically, a DD-214 and official documentation verifying the Purple Heart award.</p>`;
                html += `<p>For more details, see the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 2: Types of Preference</a>.</p>`;
                break;
            case 'result-10-point-cp':
                html += `<p>Based on your answers, you appear to be eligible for <strong>10-point Compensable Disability Preference (CP)</strong>.</p>`;
                html += `<p>This preference is generally granted to veterans who have a compensable service-connected disability of 10% or more but less than 30%.</p>`;
                html += `<p><strong>Required Documentation:</strong> Typically, a DD-214 and a letter from the Department of Veterans Affairs (VA) or a branch of the Armed Forces certifying the service-connected disability and its percentage.</p>`;
                html += `<p>For more details, see the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 2: Types of Preference</a>.</p>`;
                break;
            case 'result-10-point-cps':
                html += `<p>Based on your answers, you appear to be eligible for <strong>10-point Compensable Disability Preference (CPS)</strong>.</p>`;
                html += `<p>This preference is generally granted to veterans who have a compensable service-connected disability of 30% or more.</p>`;
                html += `<p><strong>Required Documentation:</strong> Typically, a DD-214 and a letter from the Department of Veterans Affairs (VA) or a branch of the Armed Forces certifying the service-connected disability and its percentage.</p>`;
                html += `<p>For more details, see the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 2: Types of Preference</a>.</p>`;
                break;
            case 'result-10-point-xp':
                html += `<p>Based on your answers, you appear to be eligible for <strong>10-point Other (XP)</strong> preference.</p>`;
                html += `<p>This preference applies to certain categories of veterans, including those who are not compensably disabled but who served in a war or campaign and received a Purple Heart, or who meet other specific criteria outlined by OPM.</p>`;
                html += `<p><strong>Required Documentation:</strong> Varies depending on the specific XP category. Typically, a DD-214 and relevant documentation from the VA or military branch.</p>`;
                html += `<p>For more details, see the <a href="https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/" target="_blank" rel="noopener noreferrer">OPM Vet Guide Chapter 2: Types of Preference</a>.</p>`;
                break;
            case 'incomplete-path':
                html += `<p>The assessment path is incomplete. Please try again or refer to the OPM Vet Guide for more information.</p>`;
                break;
            default:
                html += `<p>An unexpected error occurred or the assessment path is incomplete. Please try again.</p>`;
                break;
        }
        html += `<button id="startOverBtn">Start Over</button>`;
        toolSection.innerHTML = html;
        document.getElementById('startOverBtn').addEventListener('click', startOver);
    }

    function startOver() {
        currentQuestionIndex = 0;
        userAnswers = [];
        displayQuestion();
    }

    function goBack() {
        if (currentQuestionIndex > 0) {
            // This simple goBack only works for linear paths.
            // For complex decision trees, a stack of visited questions/states would be needed.
            currentQuestionIndex--;
            userAnswers.pop(); // Remove the last answer
            displayQuestion();
        }
    }

    // Initial call to start the tool
    displayQuestion();
});
