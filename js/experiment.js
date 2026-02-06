function setupGame() {

    // #region JsPsych Initialization and Timeline Setup
    var jsPsych = initJsPsych({
        show_progress_bar: true,
        auto_update_progress_bar: true,
    });

    // capture info from Prolific
    gs.prolific_info.prolificID = jsPsych.data.getURLVariable('PROLIFIC_PID');
    gs.prolific_info.prolificStudyID = jsPsych.data.getURLVariable('STUDY_ID');
    gs.prolific_info.prolificSessionID = jsPsych.data.getURLVariable('SESSION_ID');
    // generate a random subject ID that contains 8 alphanumeric characters
    const subjectID = 'subj-' + jsPsych.randomization.randomID(8);
    console.log(subjectID);

    // add the ID to the data for all trials
    jsPsych.data.addProperties({
        subjectID: subjectID,
        condition: gs.session_info.condition,
        prolificID: gs.prolific_info.prolificID,
        prolificSessionID: gs.prolific_info.prolificSessionID,
        session_timing: {}
    });

    var timeline = [];

    // #endregion

    // #region Captcha
    const captcha_resolved = false;

    const captcha_trial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '', // Blank screen while the overlay is visible
        choices: "NO_KEYS",
        on_load: function () {
            const container = document.getElementById('captcha-container');
            const btn = document.getElementById('captcha-proceed');
            container.style.display = 'block';

            window.correctCaptcha = function (response) {
                window.captchaToken = response;
                btn.style.display = 'inline-block';
            };

            // Only render if it hasn't been rendered yet
            if (document.getElementById('g-recaptcha-target').innerHTML === "") {
                grecaptcha.render('g-recaptcha-target', {
                    'sitekey': '6Le_Yk0sAAAAAEK5jvozPPEva_4_9OfSsvEEmq4u', // FIXME: replace with actual site key
                    'callback': 'correctCaptcha'
                });
            }

            btn.onclick = () => {
                container.style.display = 'none';
                jsPsych.finishTrial({ captcha_token: window.captchaToken });
            };
        }
    };
    // timeline.push(captcha_trial);

    // #endregion

    // #region Consent to Comprehension, save data
    var consent = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
            <div class="content-box">
                <div align="center" style="margin-bottom: 20px;">
                    <img src='img/harvard.svg' height=80px style='margin-right: 50px;'>
                    <img src='img/cocodev_logo.svg' height=80px>
                </div>
                <p style="text-align: center;">
                    <b>LABORATORY FOR COMPUTATION COGNITION & DEVELOPMENT<br>
                        Department of Psychology<br>Harvard University</b>
                </p>
                <p>Dear Participant,</p>
                <p>Thank you for your interest! During this study, you will read and respond to several riddles. We are most interested in when people do or do not feel stumped.</p>
                
                <p>You are being asked to participate in a project being conducted by a research team at Harvard University,
                under the direction of Dr. Tomer Ullman. We are interested in how people are able to reason quickly and in a commonsense way about the different objects and people they encounter in the world around them. A better understanding of commonsense reasoning has implications for building more intelligent machines that can reason in a more human-like way, lowering risk in different physical situations. </p>

                <p> The study will last around ${gs.study_metadata.study_duration}. Your participation in this study is completely voluntary. You may refuse to participate, or you may choose to withdraw from participation at any time, without penalty or loss of benefit to which you are otherwise entitled. There has been no harm to people involved in this study and there are no risks associated with participation.</p>

                <p>All information collected from the study will be associated with a Prolific Subject ID. Only researchers associated with this project will have access to the data. In order to make a research transparent to the scientific and broader community our study design and unidentifiable data might be made publicly available on Open Science  Framework, a network of research materials and collaboration software, but your data will not be in any way 
                identifiable.</p>
                <p>You will be reimbursed at a rate of $12/hr for your participation.</p>
                <p>Your participation in our study would be greatly appreciated. If you have any questions about the project please
                feel free to contact us at the Lab for Computation, Cognition, and Development at the Department of Psychology,
                33 Kirkland Street, Cambridge, MA 02138, or via email at 
                <a href="mailto:cocodev@g.harvard.edu">cocodev@g.harvard.edu</a>.
                You may also contact the faculty member supervising this work: Tomer Ullman, Assistant Professor of Psychology,
                1320 William James Hall, 33 Kirkland Street, Cambridge, MA, 02138, email:
                <a href="mailto:tullman@fas.harvard.edu">tullman@fas.harvard.edu</a></p>
                <p>Whom to contact about your rights in this research, for questions, concerns, suggestions, or complaints that
                are not being addressed by the researcher, or research-related harm: Committee on the Use of Human Subjects in
                Research at Harvard University. Phone: 617-496-CUHS (2847). Email: <a href="mailto:cuhs@harvard.edu">
                cuhs@harvard.edu</a>. <i>Please print this screen for your records.</i></p>
                <hr>
                <p><b>Consent Statement</b></p>
                <p>By selecting the “CONSENT” button below, I acknowledge that I am 18 or older, have read this
                consent form, and I agree to take part in this riddles study conducted by the research lab of Dr. Tomer Ullman.</p>
                <div id="consent-agree" class="jspsych-btn" style="text-align: center; margin-top: 20px;"></div>
                <p>If you do NOT agree to participate in this study, please click the decline button below.</p>
                <div id="consent-decline" class="jspsych-btn" style="text-align: center; margin-top: 20px;"></div>
            </div>
        `,
        response_ends_trial: false,
        on_load: function () {
            document.querySelector('#jspsych-progressbar-container').style.display = 'none';
            const declineButton = document.getElementById('consent-decline');
            declineButton.textContent = 'DECLINE';
            declineButton.addEventListener('click', () => {
                jsPsych.finishTrial({ response: 0 });
            });

            const consentButton = document.getElementById('consent-agree');
            consentButton.textContent = 'CONSENT';
            consentButton.addEventListener('click', () => {
                jsPsych.finishTrial({ response: 1 });
            });
        },
        on_finish: function (data) {
            if (data.response === 1) {
                jsPsych.data.dataProperties.session_timing['startInstructionTS'] = Date.now();
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                jsPsych.abortExperiment('As you have indicated that you do not consent to participate in this study, please return this submission on Prolific by selecting the <b>Cancel participation<b> button on Prolific. <br><br>Once you have done so, you may close this window.');
            }
        },
        data: {
            study_phase: "consent"
        }
    };
    timeline.push(consent);

    var instructions = {
        type: jsPsychInstructions,
        pages: [
            `<div class="content-box" style="align-content: center">
                <h3>Instructions - <em>Please read carefully!</em></h3>
                <p>Hello, and welcome to our study!</p>
                <p>In this study, we're really interested in <strong>how people solve riddles.</strong> This study has two parts:</p>
                <ol>
                <li><p>In the first part, we're going to show you ${gs.study_metadata.num_riddles} riddles, one at a time.</p>
                <ul>
                    <li><strong>Your task</strong>: Answer each riddle as best you can, and rate how confident you are in your answer.</li>
                    <li>After you answer a riddle, we will show you a solution to the riddle, and ask you how <strong>similar</strong> that solution is to your answer.</li>
                    </ul>
                    </li>
                    <li>In the second part, you'll answer a few more riddles without any additional ratings.</li>

                </ol>
                <h3 style="text-align: left;"><strong>IMPORTANT:</strong></h3>
                    <ul>
                    <li>Some of the riddles might be hard or seem impossible. That's part of the point. If you can't think of an answer, simply write "I don't know".</li>
                    <li>It doesn't matter if you get the riddles "right" or "wrong". Your payment does not depend on being correct.</li>
                    <li>We're simply interested in how people solve such riddles, so you will be most helpful to us if you just try your best to answer these, on your own.</li>
                </ul>

                <p>On the next page, we will first check your understanding of these instructions.</p>
            </div>`
        ],
        show_clickable_nav: true,
        allow_backward: false,
        data: { study_phase: "instructions" }
    };
    timeline.push(instructions);

    const comprehension_questions = [
        {
            prompt: `<b>What is your main task in this study?</b>`,
            name: 'task',
            options: ["Read and answer a series of riddles.", "Read short stories.", "Watch video clips."],
            required: true
        },
        {
            prompt: `<b>What will you do after you see the solution to each riddle?</b>`,
            name: 'after_riddle',
            options: ["Rate how much you like it.", "Write a new riddle.", "Rate how similar your response is."],
            required: true
        },
        {
            prompt: `<b>What should you do if you don't know the answer to a riddle?</b>`,
            name: 'dont_know',
            options: ["Leave the text box blank.", "Type 'I don't know'.", "Look up the answer on the internet."],
            required: true
        }
    ];

    const correct_answers = {
        task: "Read and answer a series of riddles.",
        after_riddle: "Rate how similar your response is.",
        dont_know: "Type 'I don't know'."
    };

    var comprehension_check = {
        type: jsPsychSurveyMultiChoice,
        button_label: 'Submit answers',
        preamble: function () {
            let header = '<p>Please answer the following questions to check your understanding of the instructions. You must answer correctly to continue.</p>';
            const attempts_made = jsPsych.data.get().filter({ study_phase: 'comprehension' }).values().filter(x => x.reread !== true).length;
            const attempts_left = gs.study_metadata.comprehension_max_attempts - attempts_made;
            const attempt_word = attempts_left === 1 ? 'attempt' : 'attempts';
            header += `<p>You have ${attempts_left} ${attempt_word} remaining.</p>`;

            const all_comprehension_trials = jsPsych.data.get().filter({ study_phase: 'comprehension' }).values();
            if (all_comprehension_trials.length > 0) {
                const last_attempt = all_comprehension_trials[all_comprehension_trials.length - 1];
                if (last_attempt && !last_attempt.comprehension_passed && !last_attempt.reread) {
                    const nincorrect = last_attempt.incorrect_questions.length;
                    const incorrect_msg = `<p id="incorrectmessage" style="color: red;">You got ${nincorrect} question(s) wrong. You can re-read the instructions, or revise your answers and re-submit.</p>`;
                    header = incorrect_msg + header;
                }
            }
            return header;
        },
        questions: comprehension_questions,
        data: {
            study_phase: 'comprehension',
        },
        on_load: function () {
            const container = document.querySelector('#jspsych-content');
            const wrapper = document.createElement('div');
            wrapper.className = 'content-box';
            while (container.firstChild) {
                wrapper.appendChild(container.firstChild);
            }
            container.appendChild(wrapper);

            const attempts_made = jsPsych.data.get().filter({ study_phase: 'comprehension' }).values().filter(x => x.reread !== true).length;
            if (attempts_made > 0 && document.querySelector('#incorrectmessage')) {
                const reread_button = document.createElement('button');
                reread_button.id = 'reread-instructions-btn';
                reread_button.textContent = 'Re-read Instructions';
                reread_button.className = 'jspsych-btn';
                reread_button.style.marginLeft = '10px';

                document.querySelector('#incorrectmessage').after(reread_button);

                reread_button.addEventListener('click', () => {
                    jsPsych.finishTrial({
                        reread: true,
                        comprehension_passed: false
                    });
                });
            }


            const real_attempts = jsPsych.data.get().filter({ study_phase: 'comprehension' }).values().filter(x => x.reread !== true);
            if (real_attempts.length > 0) {
                const last_attempt_data = real_attempts[real_attempts.length - 1];

                if (last_attempt_data && last_attempt_data.response) {
                    const previous_responses = last_attempt_data.response;


                    for (const question_name in previous_responses) {
                        if (previous_responses[question_name] === correct_answers[question_name]) {
                            const question_index = comprehension_questions.findIndex(q => q.name === question_name);
                            if (question_index !== -1) {
                                const correct_radio_button = document.querySelector(`input[name="jspsych-survey-multi-choice-response-${question_index}"][value="${previous_responses[question_name]}"]`);
                                if (correct_radio_button) {
                                    correct_radio_button.checked = true;
                                }
                            }
                        }
                    }
                }
            }
        },
        on_finish: function (data) {
            if (data.reread) {
                return;
            }
            let all_correct = true;
            let incorrect_questions = [];

            for (const [key, value] of Object.entries(data.response)) {
                if (value !== correct_answers[key]) {
                    all_correct = false;
                    incorrect_questions.push(key);
                }
            }
            data.comprehension_passed = all_correct;
            data.incorrect_questions = incorrect_questions;
        }
    };

    var conditional_reread_instructions = {
        timeline: [instructions],
        conditional_function: function () {
            const last_trial_data = jsPsych.data.get().last(1).values()[0];
            return last_trial_data && last_trial_data.reread === true;
        }
    };

    var comprehension_loop = {
        timeline: [comprehension_check, conditional_reread_instructions],
        loop_function: function () {
            const last_attempt = jsPsych.data.get().filter({ study_phase: 'comprehension' }).last(1).values()[0];
            const attempts_made = jsPsych.data.get().filter({ study_phase: 'comprehension' }).values().filter(x => x.reread !== true).length;

            if (last_attempt.comprehension_passed || attempts_made >= gs.study_metadata.comprehension_max_attempts) {
                return false;
            } else {
                return true;
            }
        }
    };
    timeline.push(comprehension_loop);

    // save all current data to datapipe
    const save_till_comprehension = {
        type: jsPsychPipe,
        action: "save",
        experiment_id: gs.study_metadata.experimentIdOSF,
        filename: `${jsPsych.data.dataProperties.subjectID}_part1.json`,
        data_string: () => jsPsych.data.get().json()
    };
    timeline.push(save_till_comprehension);

    // #endregion

    // #region failed comprehension

    var final_failure_screen = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="content-box">
                <p>Unfortunately, you did not pass the comprehension check.</p>
                <p>The study cannot continue. Please click the button below to return to Prolific. Thank you for your time.</p>
            </div>
        `,
        choices: ['Return to Prolific'],
        on_finish: function () {
            window.onbeforeunload = null;
            window.open('https://app.prolific.com/submissions/complete?cc=CBWZSU08', '_self');
        }
    };

    var conditional_failure = {
        timeline: [final_failure_screen],
        conditional_function: function () {
            const last_attempt = jsPsych.data.get().filter({ study_phase: 'comprehension' }).last(1).values()[0];
            return last_attempt && !last_attempt.comprehension_passed;
        }
    }
    timeline.push(conditional_failure); // Show failure screen if needed.
    // #endregion

    var main_experiment_list = []

    // #region RIDDLE TRIALS
    var preRiddleMessage = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="content-box" style="align-content: center">
            <p>You're ready to begin! In this first part of the study, your task is to:</p>
                <ul>
                <li>Answer each riddle as best you can, and rate how confident you are in your answer. </li>
                <li>After you answer a riddle, we will show you a solution to the riddle, and ask you how <strong>similar</strong> that solution is to your answer.</li>
                </ul>
                <p><br>
                <p>Remember: these riddles might be a little bit tricky.</p>
                <p>Please try your very best, but it's perfectly okay to write "I don't know."</p>
                <p>We are most interested in your thought process, so please provide your genuine response without getting help or looking up the answers online.</p>
                
            </div>
        `,
        choices: ['Start'],
        on_finish: function () {
            jsPsych.data.dataProperties.session_timing['startRiddlesTS'] = Date.now();
            document.querySelector('#jspsych-progressbar-container').style.display = 'block';
        }
    };

    var riddleTrials = [];
    // const conditions = ['grouped'];
    // gs.session_info.condition = jsPsych.randomization.sampleWithReplacement(conditions, 1)[0];
    let riddleSequence = [];
    if (gs.session_info.condition === 'fixed') {
        riddleSequence = [...stimuli]
    } else if (gs.session_info.condition === 'shuffled') {
        riddleSequence = jsPsych.randomization.shuffle([...stimuli])
    }
    else if (gs.session_info.condition === 'grouped') {
        const container = jsPsych.randomization.shuffle(stimuli.filter(r => r.riddle_cat === 'common'));
        const quantity = jsPsych.randomization.shuffle(stimuli.filter(r => r.riddle_cat === 'quantity'));
        const viewing = jsPsych.randomization.shuffle(stimuli.filter(r => r.riddle_cat === 'viewing'));
        const categoryOrder = jsPsych.randomization.shuffle([container, quantity, viewing]);
        riddleSequence = categoryOrder.flat();
    } else if (gs.session_info.condition === 'mixed') {
        const predefinedCategoryOrders = [
            ['container', 'quantity', 'viewing', 'container', 'quantity', 'viewing', 'container', 'quantity', 'viewing'],
            ['container', 'quantity', 'viewing', 'container', 'viewing', 'quantity', 'container', 'quantity', 'viewing'],
            ['container', 'quantity', 'container', 'viewing', 'quantity', 'viewing', 'container', 'quantity', 'viewing'],
            ['container', 'viewing', 'container', 'quantity', 'viewing', 'quantity', 'container', 'viewing', 'quantity'],
            ['container', 'viewing', 'quantity', 'container', 'quantity', 'viewing', 'quantity', 'container', 'viewing'],
            ['quantity', 'container', 'viewing', 'container', 'quantity', 'viewing', 'container', 'quantity', 'viewing'],
            ['quantity', 'container', 'viewing', 'quantity', 'container', 'viewing', 'quantity', 'container', 'viewing'],
            ['quantity', 'container', 'viewing', 'quantity', 'viewing', 'container', 'quantity', 'viewing', 'container'],
            ['quantity', 'viewing', 'container', 'quantity', 'container', 'viewing', 'quantity', 'viewing', 'container'],
            ['quantity', 'viewing', 'container', 'viewing', 'quantity', 'container', 'quantity', 'container', 'viewing'],
            ['viewing', 'container', 'quantity', 'container', 'quantity', 'viewing', 'container', 'viewing', 'quantity'],
            ['viewing', 'container', 'quantity', 'container', 'viewing', 'quantity', 'viewing', 'container', 'quantity'],
            ['viewing', 'container', 'quantity', 'viewing', 'container', 'quantity', 'container', 'viewing', 'quantity'],
            ['viewing', 'quantity', 'container', 'quantity', 'container', 'viewing', 'container', 'viewing', 'quantity'],
            ['viewing', 'quantity', 'container', 'viewing', 'quantity', 'container', 'viewing', 'container', 'quantity']
        ];
        const chosenCategoryOrder = jsPsych.randomization.sampleWithReplacement(predefinedCategoryOrders, 1)[0];
        const shuffledStimuliByCategory = {
            container: jsPsych.randomization.shuffle(stimuli.filter(s => s.riddle_cat === 'container')),
            quantity: jsPsych.randomization.shuffle(stimuli.filter(s => s.riddle_cat === 'quantity')),
            viewing: jsPsych.randomization.shuffle(stimuli.filter(s => s.riddle_cat === 'viewing'))
        };
        chosenCategoryOrder.forEach(categoryName => {
            riddleSequence.push(shuffledStimuliByCategory[categoryName].pop());
        });
    }

    riddleSequence.forEach((riddle, trialnum) => {
        let startTime;
        this_trial_data = {};
        const questionTrial = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: `
                <div class="content-box">
                    <p class="riddle-prompt">${riddle.riddle_text}</p>
                    <textarea id="riddle-response-${riddle.riddle_label}" class="riddle-input" rows="3" placeholder="Type your response here..."></textarea>
                    <div id="button-container-q-${riddle.riddle_label}"></div>
                    <div id="validation-msg-${riddle.riddle_label}" class="validation-msg"></div>
                </div>
            `,
            response_ends_trial: false,
            on_load: function () {
                startTime = performance.now();
                const minTime = (gs.study_metadata.response_min_seconds) * 1000;
                const minLength = gs.study_metadata.response_min_chars;

                const container = document.getElementById(`button-container-q-${riddle.riddle_label}`);
                const textarea = document.getElementById(`riddle-response-${riddle.riddle_label}`);
                const message = document.getElementById(`validation-msg-${riddle.riddle_label}`);

                const button = document.createElement('button');
                button.classList.add('jspsych-btn');
                container.appendChild(button);

                button.disabled = true;

                const timer = setInterval(() => {
                    const elapsedTime = performance.now() - startTime;
                    const timeLeft = Math.ceil((minTime - elapsedTime) / 1000);

                    if (timeLeft > 0) {
                        button.textContent = `Able to submit in ${timeLeft}...`;
                    } else {
                        clearInterval(timer);
                        button.disabled = false;
                        button.textContent = 'Submit Answer';
                    }
                }, 500);

                button.addEventListener('click', () => {
                    const textLength = textarea.value.length;
                    const elapsedTime = performance.now() - startTime;

                    if (textLength >= minLength) {
                        message.textContent = "";
                        const response_value = textarea.value;
                        clearInterval(timer);
                        jsPsych.finishTrial({ response: response_value, rt: elapsedTime });
                    } else {
                        message.textContent = `Please write at least ${minLength} characters.`;
                    }
                });
            },
            data: {
                study_phase: 'riddles',
                item_type: 'response',
                riddle_label: riddle.riddle_label,
                riddle_cat: riddle.riddle_cat,
                correct_answer: riddle.correct_answer,
                riddle_number: trialnum,
            },
            on_finish: function () {
                this_trial_data['riddle'] = jsPsych.data.getLastTrialData();;
            }
        };
        const confidenceTrial = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: `
                <div class="content-box">
                    <p>How confident do you feel that your answer is correct?</p>
                    <div class="slider-container">
                        <input type="range" id="confidence-slider" min="0" max="100" value="50" class="slider">
                        <div class="slider-labels">
                            <span>Not at all confident</span>
                            <span>Absolutely confident</span>
                        </div>
                    </div>
                    <div id="button-container-c-${riddle.riddle_label}"></div>
                </div>
            `,
            response_ends_trial: false,
            on_load: function () {
                startTime = performance.now();
                const container = document.getElementById(`button-container-c-${riddle.riddle_label}`);
                const button = document.createElement('button');
                button.classList.add('jspsych-btn');
                button.textContent = 'Continue';
                button.disabled = true;
                container.appendChild(button);
                slider = document.getElementById('confidence-slider');
                slider.oninput = function () {
                    button.disabled = false;
                }
                button.addEventListener('click', () => {
                    const sliderValue = document.getElementById('confidence-slider').value;
                    const elapsedTime = performance.now() - startTime;
                    jsPsych.finishTrial({ response: sliderValue, rt: elapsedTime });
                });
            },
            data: {
                study_phase: 'riddles',
                item_type: 'confidence_rating',
                riddle_label: riddle.riddle_label,
                riddle_cat: riddle.riddle_cat,
                correct_answer: riddle.correct_answer,
                riddle_number: trialnum,
            },
            on_finish: function () {
                this_trial_data['confidence'] = jsPsych.data.getLastTrialData();
            }
        };
        const similarityTrial = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: `
                <div class="content-box">
                    <p>Here's one answer:</p>
                    <p class="riddle-solution">${riddle.riddle_answer}</p>
                    <hr class="separator">
                    <p>Please rate how similar your answer was to this solution.</p>
                    <div id="button-container-s-${riddle.riddle_label}" class="similarity-buttons"></div>
                </div>
            `,
            response_ends_trial: false,
            on_load: function () {
                startTime = performance.now();
                const container = document.getElementById(`button-container-s-${riddle.riddle_label}`);
                const options = [
                    "I didn't respond / I didn't know",
                    "My answer is different",
                    "My answer is the same or similar"
                ];
                options.forEach((text, index) => {
                    const button = document.createElement('button');
                    button.classList.add('jspsych-btn');
                    button.textContent = text;
                    button.addEventListener('click', () => {
                        const elapsedTime = performance.now() - startTime;
                        jsPsych.finishTrial({ response: text, rt: elapsedTime });
                    });
                    container.appendChild(button);
                });
            },
            data: {
                study_phase: 'riddles',
                item_type: 'similarity_rating',
                riddle_label: riddle.riddle_label,
                condition: gs.session_info.condition,
                riddle_number: trialnum,
            }
        };
        riddleTrials.push(questionTrial, confidenceTrial, similarityTrial);
    });

    main_experiment_list.push([preRiddleMessage, ...riddleTrials])


    // save all current data to datapipe
    const save_till_part2 = {
        type: jsPsychPipe,
        action: "save",
        experiment_id: gs.study_metadata.experimentIdOSF,
        filename: `${jsPsych.data.dataProperties.subjectID}_part2.json`,
        data_string: () => jsPsych.data.get().json()
    };
    timeline.push(save_till_part2);
    // #endregion

    // #region CRT trials
    var preCRTMessage = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="content-box" style="align-content: center">
            <p>Great job! Now, we have a final set of ${crt.length} riddles.</p>
            <p>For these riddles, just provide your best answer.</p>
            <p>You don't need to rate your confidence or similarity to the solution.</p>
                <br>
                <br>
                <p>Remember: We are most interested in your thought process, so please provide your genuine response without getting help or looking up the answers online. It's perfectly okay to write "I don't know", but please try your very best. </p>
            </div>
        `,
        choices: ['Start'],
        on_finish: function () {
            jsPsych.data.dataProperties.session_timing['startRiddlesTS'] = Date.now();
            document.querySelector('#jspsych-progressbar-container').style.display = 'block';
        }
    };
    var crtTrials = crt.map((item, trial_number) => {
        return {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: `
                <div class="content-box">
                <p class="riddle-prompt">${item.riddle_text}</p>
                <textarea id="riddle-response-${item.riddle_label}" class="riddle-input" rows="3" placeholder="Type your response here..."></textarea>
                <div id="button-container-q-${item.riddle_label}"></div>
                <div id="validation-msg-${item.riddle_label}" class="validation-message"></div>
                </div>
        `,
            response_ends_trial: false,
            data: {
                study_phase: 'crt',
                riddle_label: item.riddle_label,
                riddle_answer: item.riddle_answer,
                riddle_number: trial_number,
            },
            on_load: function () {
                startTime = performance.now();
                const minLength = 4; // gs.study_metadata.response_min_chars;

                const container = document.getElementById(`button-container-q-${item.riddle_label}`);
                const textarea = document.getElementById(`riddle-response-${item.riddle_label}`);
                const message = document.getElementById(`validation-msg-${item.riddle_label}`);

                const button = document.createElement('button');
                button.classList.add('jspsych-btn');
                button.textContent = 'Submit Answer';
                container.appendChild(button);

                button.addEventListener('click', () => {
                    const textLength = textarea.value.length;
                    const elapsedTime = performance.now() - startTime;

                    if (textLength >= minLength) {
                        message.textContent = "";
                        const response_value = textarea.value;
                        // clearInterval(timer);
                        jsPsych.finishTrial({ response: response_value, rt: elapsedTime });
                    } else {
                        message.textContent = `Please write at least ${minLength} characters.`;
                    }
                });
            }
        };
    });
    main_experiment_list.push([preCRTMessage, ...crtTrials])

    // save all current data to datapipe
    const save_till_part3 = {
        type: jsPsychPipe,
        action: "save",
        experiment_id: gs.study_metadata.experimentIdOSF,
        filename: `${jsPsych.data.dataProperties.subjectID}_part3.json`,
        data_string: () => jsPsych.data.get().json()
    };
    main_experiment_list.push(save_till_part3);
    // #endregion

    // #region Exit Survey
    var preExitMessage = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="content-box" style="align-content: center">
                <p>You've completed the study!</p>
                <p>On the next page, please complete a brief set of questions about how the study went.</p>
                <p>Once you submit your answers, you'll be redirected back to Prolific and credited for participation.</p>
            </div>
        `,
        choices: ['Continue'],
        on_finish: function () {
            jsPsych.data.dataProperties.session_timing['startSurveyTS'] = Date.now();
        }
    };
    main_experiment_list.push(preExitMessage);

    const all_riddle_text = riddleSequence.map(r => r.riddle_text).concat(crt.map(r => r.riddle_text));
    all_riddle_text.forEach((item, index) => all_riddle_text[index] = item.replace(/<br>/g, "  "));

    var exitSurvey = {
        type: jsPsychSurvey,
        data: { study_phase: "exit survey" },
        survey_json: {
            title: 'Debrief survey',
            description: 'Please answer the following questions. Your response will not effect your final compensation',
            completeText: 'Submit answers',
            pages: [
                {
                    name: "page1",
                    title: 'Page 1 of 3: Your experience (required)',
                    elements: [
                        {
                            type: 'comment',
                            name: 'participantExplanations',
                            title: `Please explain how you tried to solve these riddles. Did you use any specific strategies ? `,
                            placeholder: "Please describe your thought process.",
                            rows: 2,
                            auto_grow: true,
                            isRequired: true
                        },
                        {
                            type: 'rating',
                            name: 'participantEffort',
                            title: 'How much effort did you put into attempting to solve the riddles?',
                            minRateDescription: 'Very Low Effort',
                            maxRateDescription: 'Very High Effort',
                            rateValues: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }],
                            isRequired: true,
                        },
                        {
                            type: 'rating',
                            name: 'participantDifficulty',
                            title: 'How difficult did you find these riddles?',
                            minRateDescription: 'Very Easy',
                            maxRateDescription: 'Very Difficult',
                            rateValues: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }],
                            isRequired: true,
                        },
                        {
                            type: 'checkbox',
                            name: 'help',
                            title: 'Did you use any other resources to answer these riddles? Please answer honestly. Your response will not effect your final compensation.',
                            choices: ['ChatGPT', 'Google search'],
                            colCount: 1,
                            showNoneItem: true,
                            showOtherItem: true,
                            isRequired: true,
                        },
                        {
                            type: 'text',
                            name: "technicalDifficultiesComments",
                            title: "Do you have any other comments or feedback to share with us about your experience? If you encountered any technical difficulties, please briefly describe the issue.",
                            placeholder: "Please share any feedback or technical difficulties.",
                            required: false,
                            rows: 2,
                            auto_grow: true,
                        }
                    ]
                },
                {
                    name: 'page2',
                    title: 'Page 2 of 3: Prior Experience (required)',
                    elements: [{
                        type: 'checkbox',
                        name: 'riddleFamiliarity',
                        title: `Please select ALL of the riddles that you have seen before this study. We understand that some of these riddles may be familiar to you from prior experience. Your honest response will help us interpret the results of this study.`,
                        description: 'If you have not seen any of these riddles before, select None.',
                        isRequired: true,
                        colCount: 1,
                        showNoneItem: true,
                        showSelectAllItem: false,
                        choices: all_riddle_text
                    },
                    ]
                },
                {
                    name: 'page3',
                    title: 'Page 3 of 3: Demographic Information (OPTIONAL)',
                    elements: [
                        {
                            type: 'text',
                            name: 'participantYears',
                            title: 'How many years old are you?',
                            inputType: 'number',
                            min: 0,
                            max: 120,
                            textbox_columns: 5,
                            isRequired: false
                        },
                        {
                            type: 'radiogroup',
                            name: 'participantGender',
                            title: "What gender do you identify as?",
                            choices: ['Male', 'Female', 'Non-binary', 'Prefer not to answer'],
                            showOtherItem: true,
                            isRequired: false
                        },
                        {
                            type: 'radiogroup',
                            name: 'participantEducation',
                            title: "What is the highest education level you've attained?",
                            choices: ['Less than high school', 'High school diploma or equivalent', 'Some college', 'College graduate (4 or 5 year)', "Master's degree (or other postgraduate training)", 'Doctoral degree'],
                            showOtherItem: false,
                            isRequired: false
                        },
                        {
                            type: 'checkbox',
                            name: 'participantRace',
                            title: 'What is your race?',
                            choices: ['White', 'Black/African American', 'American Indian/Alaska Native', 'Asian', 'Native Hawaiian/Pacific Islander', 'Multiracial/Mixed', 'Prefer not to answer'],
                            showNoneItem: false,
                            showOtherItem: true,
                            isRequired: false,
                        },
                        {
                            type: 'radiogroup',
                            name: 'participantEthnicity',
                            title: 'What is your ethnicity?',
                            choices: ['Hispanic', 'Non-Hispanic', 'Prefer not to answer'],
                            isRequired: false
                        },
                    ]
                },
            ]
        }
    };
    main_experiment_list.push(exitSurvey);

    // save all current data to datapipe
    const save_all_data = {
        type: jsPsychPipe,
        action: "save",
        experiment_id: gs.study_metadata.experimentIdOSF,
        filename: `${jsPsych.data.dataProperties.subjectID}.json`,
        data_string: () => jsPsych.data.get().json()
    };
    main_experiment_list.push(save_all_data);
    // #endregion

    // #region Goodbye and redirect to Prolific

    var goodbye = {
        type: jsPsychInstructions,
        pages: [`
        <div class="content-box" style = "align-content: center">
                <p>Thanks for participating in our study!</p>
                <p>Please click the <em>Complete Study</em> button to submit all your responses and end the study.</p>
                <p>You will be redirected to Prolific and receive credit for your participation.</p>
            </div>
        `],
        show_clickable_nav: true,
        allow_backward: false,
        button_label_next: 'Complete Study',
        data: { study_phase: "exit survey" },
        on_finish: () => {
            window.onbeforeunload = null;
            window.open('https://app.prolific.com/submissions/complete?cc=CN3X39CF', '_self')
        }
    };
    main_experiment_list.push(goodbye);

    const main_experiment_timeline = {
        timeline: main_experiment_list,
        conditional_function: function () {
            // Run the experiment only if the last comprehension attempt was successful.
            const last_attempt = jsPsych.data.get().filter({ study_phase: 'comprehension' }).last(1).values()[0];
            return last_attempt.comprehension_passed;
        }
    }

    timeline.push(main_experiment_timeline); // The rest of the experiment, now conditional on passing the check

    document.addEventListener('contextmenu', event => event.preventDefault());
    ['cut', 'copy', 'paste'].forEach(event => {
        document.addEventListener(event, e => e.preventDefault());
    });

    jsPsych.run(timeline);
};