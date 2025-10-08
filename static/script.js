
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const questionTitleEl = document.getElementById('question-title');
    const questionDescriptionEl = document.getElementById('question-description');
    const sampleTestCasesContainerEl = document.getElementById('sample-test-cases-container');
    const resultsOutputEl = document.getElementById('results-output');
    const runBtn = document.getElementById('run-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const questionCounterEl = document.getElementById('question-counter');
    const mainContentEl = document.querySelector('.main-content');
    const finalSummaryContainerEl = document.getElementById('final-summary-container');
    const customInputAreaEl = document.getElementById('custom-input-area');
    const customRunBtn = document.getElementById('custom-run-btn');
    const customOutputContainerEl = document.getElementById('custom-output-container');
    const customOutputAreaEl = document.getElementById('custom-output-area');

    // --- State ---
    let questions = [];
    let userResults = [];
    let currentQuestionIndex = 0;
    let userId = null; // MODIFIED: To store the current user's ID.

    // --- Initialize CodeMirror Editor ---
    const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        lineNumbers: true,
        mode: 'groovy',
        theme: 'material-darker',
        lineWrapping: true,
        autofocus: true,
        indentUnit: 4,
    });
    
    // MODIFIED: Function to get user ID from URL.
    const getUserId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('user');
    };

    const initializeResults = () => {
        userResults = questions.map(q => ({
            question_id: q.question_id,
            question: q.question,
            user_code: q.code || "",
            status: 'Not Attempted',
            results: [],
            score: 0,
            max_score: 0
        }));
    };

    const renderSampleTestCases = (sampleCases) => {
        sampleTestCasesContainerEl.innerHTML = '';
        if (!sampleCases || sampleCases.length === 0) {
            sampleTestCasesContainerEl.innerHTML = '<p>No sample test cases provided.</p>';
            return;
        }
        sampleCases.forEach((testCase, index) => {
            const caseEl = document.createElement('div');
            caseEl.className = 'test-case';
            caseEl.innerHTML = `
                <h4>Case ${index + 1}</h4>
                <p><strong>Input:</strong></p>
                <pre><code>${testCase.input}</code></pre>
                <p><strong>Expected Output:</strong></p>
                <pre><code>${testCase.expected_output}</code></pre>
            `;
            sampleTestCasesContainerEl.appendChild(caseEl);
        });
    };
   
    const renderResults = (resultData) => {
        resultsOutputEl.innerHTML = '';
        const overallStatusEl = document.createElement('div');
        overallStatusEl.className = 'overall-status';
        const statusClass = resultData.overall_status.toLowerCase().replace(/\s+/g, '-');
        
        overallStatusEl.innerHTML = `
            <span>Overall Status: <span class="status status-${statusClass}">${resultData.overall_status}</span></span>
            <span class="score">Score: ${resultData.score} / ${resultData.max_score}</span>
        `;
        resultsOutputEl.appendChild(overallStatusEl);

        const resultsList = document.createElement('div');
        resultsList.className = 'results-list';

        resultData.results.forEach(res => {
            if (res.hidden) return;

            const resultCaseEl = document.createElement('div');
            const statusClass = res.status.toLowerCase();
            resultCaseEl.className = `result-case status-border-${statusClass}`;
            
            const caseTitle = `Sample Test Case #${res.test_case_id}`;
            let detailsHTML = '';

            if (res.status === 'Error') {
                detailsHTML = `<div class="result-details"><p><strong>Error Details:</strong> <pre>${res.user_output || 'No error details provided.'}</pre></p></div>`;
            } else {
                detailsHTML = `<div class="result-details">
                    <p><strong>Input:</strong> <pre>${res.input}</pre></p>
                    <p><strong>Your Output (JSON):</strong> <pre>${res.user_output || '""'}</pre></p>
                    <p><strong>Expected (Groovy):</strong> <pre>${res.expected_output}</pre></p>
                </div>`;
            }

            resultCaseEl.innerHTML = `<div class="result-header"><span>${caseTitle}</span><span class="status status-${statusClass}">${res.status}</span></div>${detailsHTML}`;
            resultsList.appendChild(resultCaseEl);
        });

        resultsOutputEl.appendChild(resultsList);
    };

    const loadQuestion = (index) => {
        if (index < 0 || index >= questions.length) return;
        
        userResults[currentQuestionIndex].user_code = editor.getValue();
        
        currentQuestionIndex = index;
        const question = questions[index];
        const result = userResults[index];
        
        questionTitleEl.textContent = `Task ${index + 1}: ${question.topic}`;
        questionDescriptionEl.textContent = question.question;
        questionCounterEl.textContent = `${index + 1} / ${questions.length}`;
        
        renderSampleTestCases(question.sample_test_cases);
        editor.setValue(result.user_code);

        resultsOutputEl.innerHTML = '<p class="placeholder">Run the code to see the results.</p>';
        customInputAreaEl.value = '';
        customOutputContainerEl.classList.add('hidden');

        prevBtn.disabled = index === 0;
        nextBtn.classList.toggle('hidden', index === questions.length - 1);
        finishBtn.classList.toggle('hidden', index !== questions.length - 1);
    };

    // MODIFIED: Fetches questions for the specific user ID.
    const fetchQuestions = async () => {
        userId = getUserId();
        if (!userId) {
            mainContentEl.innerHTML = `
                <h2>Welcome!</h2>
                <p>Please specify your user ID in the URL to begin.</p>
                <p>For example: <a href="?user=user_1">?user=user_1</a> or <a href="?user=user_2">?user=user_2</a></p>
            `;
            document.querySelector('footer').classList.add('hidden');
            return;
        }

        try {
            const response = await fetch(`/api/questions/${userId}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }
            questions = await response.json();
            if (questions.length > 0) {
                initializeResults();
                loadQuestion(0);
            } else {
                 questionTitleEl.textContent = `No Questions Found for ${userId}`;
                 mainContentEl.innerHTML = `<p>Could not find any questions for your user ID.</p>`;
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
            questionTitleEl.textContent = `Error Loading Questions`;
            mainContentEl.innerHTML = `<p>${error.message}</p>`;
        }
    };

    const runCode = async () => {
        const userCode = editor.getValue();
        const currentResult = userResults[currentQuestionIndex];
        currentResult.user_code = userCode;

        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        resultsOutputEl.innerHTML = '<p class="placeholder">Executing all test cases...</p>';

        try {
            const response = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // MODIFIED: Send user_id along with the request.
                body: JSON.stringify({ 
                    code: userCode, 
                    question_id: currentResult.question_id,
                    user_id: userId 
                }),
            });

            const resultData = await response.json();
            if (!response.ok) throw new Error(resultData.error || 'An unknown server error occurred.');
            
            currentResult.status = resultData.overall_status;
            currentResult.results = resultData.results;
            currentResult.score = resultData.score;
            currentResult.max_score = resultData.max_score;
            
            renderResults(resultData);

        } catch (error) {
            console.error('Error running code:', error);
            resultsOutputEl.innerHTML = `<div class="overall-status"><span class="status status-error">Client Error</span></div><p>Failed to run code: ${error.message}</p>`;
            currentResult.status = 'Error';
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = 'Run Code';
        }
    };

    const runWithCustomInput = async () => {
        const userCode = editor.getValue();
        const customInput = customInputAreaEl.value;

        customRunBtn.disabled = true;
        customRunBtn.textContent = 'Running...';
        customOutputContainerEl.classList.remove('hidden');
        customOutputAreaEl.textContent = 'Executing...';

        try {
            const response = await fetch('/api/custom_run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: userCode, input: customInput }),
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Server error');

            if (result.status === 'Error') {
                 customOutputAreaEl.textContent = `Status: Error\n\n${result.output}`;
            } else {
                 customOutputAreaEl.textContent = `Status: Success\n\nOutput (JSON):\n${result.output}`;
            }

        } catch (error) {
            console.error('Error during custom run:', error);
            customOutputAreaEl.textContent = `Client Error: ${error.message}`;
        } finally {
            customRunBtn.disabled = false;
            customRunBtn.textContent = 'Run with Custom Input';
        }
    };
    
    const displayFinalSummary = () => {
        mainContentEl.classList.add('hidden');
        finalSummaryContainerEl.classList.remove('hidden');
        document.querySelector('footer').classList.add('hidden');

        let totalScore = 0;
        let totalMaxScore = 0;
        
        let summaryHTML = `<h2>Test Completed for ${userId}!</h2><h3>Final Scores</h3>`;
        summaryHTML += '<div class="final-scores-list">';

        userResults.forEach((result, index) => {
            summaryHTML += `
                <div class="final-score-item">
                    <span>Task ${index + 1} (Question #${result.question_id}):</span>
                    <span class="score-value">${result.score} / ${result.max_score}</span>
                </div>
            `;
            totalScore += result.score;
            totalMaxScore += result.max_score;
        });

        summaryHTML += '</div>';
        summaryHTML += `<hr><div class="total-score"><h4>Total Score: ${totalScore} / ${totalMaxScore}</h4></div>`;

        finalSummaryContainerEl.innerHTML = summaryHTML;
    };

    // MODIFIED: Sends user_id when saving results.
    const finishAndSaveTest = async () => {
        userResults[currentQuestionIndex].user_code = editor.getValue();
        finishBtn.disabled = true;
        finishBtn.textContent = 'Saving...';

        try {
            const response = await fetch('/api/save_results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    results: userResults
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save results.');
            
            displayFinalSummary();
            editor.setOption("readOnly", true);

        } catch (error) {
            console.error('Error saving test results:', error);
            alert(`Error: ${error.message}`);
            finishBtn.disabled = false;
            finishBtn.textContent = 'Finish Test';
        }
    };

    // --- Event Listeners ---
    runBtn.addEventListener('click', runCode);
    customRunBtn.addEventListener('click', runWithCustomInput);
    prevBtn.addEventListener('click', () => loadQuestion(currentQuestionIndex - 1));
    nextBtn.addEventListener('click', () => loadQuestion(currentQuestionIndex + 1));
    finishBtn.addEventListener('click', finishAndSaveTest);
    
    // --- Initial Load ---
    fetchQuestions();
});