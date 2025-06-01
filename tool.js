// Veterans' Preference Interactive Tool Logic
(function() {
    'use strict';

    // State management
    const state = {
        currentQuestionId: null,
        history: [],
        answers: {},
        totalSteps: 0,
        currentStep: 0,
        animating: false
    };

    // Decision tree structure
    const vetPreferenceTree = {
        'START': {
            id: 'START',
            questionText: 'Are you seeking information about Veterans\' Preference for yourself or someone else?',
            answers: [
                {
                    answerText: 'For myself (I am a veteran or current service member)',
                    nextQuestionId: 'VETERAN_STATUS'
                },
                {
                    answerText: 'For a family member',
                    nextQuestionId: 'FAMILY_RELATIONSHIP'
                },
                {
                    answerText: 'I am an HR professional seeking general information',
                    resultOutcome: {
                        type: 'info',
                        title: 'HR Professional Resources',
                        description: 'As an HR professional, you have access to comprehensive resources.',
                        additionalInfo: [
                            'Review the complete OPM Vet Guide for HR Professionals',
                            'Consult agency-specific policies',
                            'Contact OPM for specific case guidance'
                        ],
                        opmLinks: [
                            {
                                text: 'OPM Vet Guide for HR Professionals',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/'
                            }
                        ]
                    }
                }
            ]
        },
        
        'VETERAN_STATUS': {
            id: 'VETERAN_STATUS',
            questionText: 'What is your current military service status?',
            answers: [
                {
                    answerText: 'Discharged/Separated veteran',
                    nextQuestionId: 'DISCHARGE_TYPE'
                },
                {
                    answerText: 'Current active duty service member',
                    nextQuestionId: 'ACTIVE_DUTY_STATUS'
                },
                {
                    answerText: 'Retired military',
                    nextQuestionId: 'RETIREMENT_TYPE'
                },
                {
                    answerText: 'Current Reserve or National Guard member',
                    nextQuestionId: 'RESERVE_STATUS'
                }
            ]
        },
        
        'DISCHARGE_TYPE': {
            id: 'DISCHARGE_TYPE',
            questionText: 'What type of discharge did you receive from military service?',
            helpText: 'Your discharge characterization is shown on your DD-214 or equivalent discharge documentation.',
            answers: [
                {
                    answerText: 'Honorable',
                    nextQuestionId: 'SERVICE_DATES'
                },
                {
                    answerText: 'General (Under Honorable Conditions)',
                    nextQuestionId: 'SERVICE_DATES'
                },
                {
                    answerText: 'Other Than Honorable (OTH)',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: 'Veterans\' Preference requires an honorable or general discharge.',
                        additionalInfo: [
                            'You may be able to upgrade your discharge through a military discharge review board',
                            'Some VA benefits may still be available depending on the circumstances'
                        ],
                        opmLinks: [
                            {
                                text: 'Character of Discharge Requirements',
                                url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#discharge'
                            }
                        ]
                    }
                },
                {
                    answerText: 'Bad Conduct or Dishonorable',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: 'Veterans\' Preference is not available with a bad conduct or dishonorable discharge.',
                        additionalInfo: [
                            'Discharge upgrades may be possible in limited circumstances',
                            'Consult with a Veterans Service Organization for assistance'
                        ]
                    }
                },
                {
                    answerText: 'Uncharacterized or Entry Level Separation',
                    nextQuestionId: 'ENTRY_LEVEL_SERVICE'
                }
            ]
        },
        
        'SERVICE_DATES': {
            id: 'SERVICE_DATES',
            questionText: 'When did you serve on active duty?',
            helpText: 'Select all periods that apply to your service.',
            multiSelect: true, // Note: Current tool logic handles single select best. For multi-select, UI and `handleAnswer` would need larger changes. Assuming single informative selection for now.
            answers: [
                {
                    answerText: 'During a war, campaign, or expedition',
                    nextQuestionId: 'DISABILITY_STATUS'
                },
                {
                    answerText: 'Served at least 180 consecutive days, any part after 9/11/80', // Covers Gulf War & Post-9/11 generally for non-disabled
                    nextQuestionId: 'DISABILITY_STATUS'
                },
                 {
                    answerText: 'Gulf War (Aug 2, 1990 - Jan 2, 1992)',
                    nextQuestionId: 'DISABILITY_STATUS'
                },
                {
                    answerText: 'Only during peacetime before Sept 8, 1980 (officer) or Oct 15, 1976 (enlisted) AND without campaign medal',
                    resultOutcome: {
                        type: 'complex', // Changed from not-eligible to complex as disability can override
                        title: 'Eligibility Depends on Other Factors',
                        description: 'Peacetime service outside specific legislated periods typically does not qualify for Veterans\' Preference unless you have a service-connected disability or received a campaign/expeditionary medal.',
                        additionalInfo: [
                            'If you have a VA-rated service-connected disability, you may still be eligible for 10-point preference.',
                            'If you received a campaign or expeditionary medal for this service, you may be eligible for 5-point preference.'
                        ],
                        nextQuestionId_if_applicable: 'DISABILITY_STATUS_PEACETIME_CHECK' // Hypothetical next step if we want to refine
                    }
                },
                { // Added an option for "I'm not sure/Other" for robustness
                    answerText: "I'm not sure / Other",
                    nextQuestionId: 'DISABILITY_STATUS' // Default to checking disability, a common qualifier
                }
            ]
        },
        
        'DISABILITY_STATUS': {
            id: 'DISABILITY_STATUS',
            questionText: 'Do you have a service-connected disability rated by the VA, or have you received a Purple Heart?',
            helpText: 'A service-connected disability is one that the VA has determined was caused or aggravated by your military service.',
            answers: [
                {
                    answerText: 'Yes, rated 30% or more',
                    resultOutcome: { // Direct to result as distinction between 30% and Purple Heart with 30% for CPS is complex for this tool path
                        type: 'eligible-10-point-cps', // Using a more specific type for styling if needed
                        title: 'Potentially Eligible for 10-Point Preference (CPS or XP)',
                        description: 'You appear to be eligible for 10-point preference, likely as a 30% or more disabled veteran (CPS). This provides significant advantages.',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation',
                            'SF-15 Application for 10-Point Veteran Preference',
                            'VA letter (dated within the last 12 months) confirming your service-connected disability rating of 30% or more.'
                        ],
                        opmLinks: [
                            { text: '10-Point (30% or more disabled) Preference', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#cps' }
                        ]
                    }
                },
                {
                    answerText: 'Yes, rated 10% or 20%',
                    resultOutcome: {
                        type: 'eligible-10-point', // CP
                        title: 'Eligible for 10-Point Preference (CP)',
                        description: 'You appear to be eligible for 10-point compensable preference (CP).',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation',
                            'SF-15 Application for 10-Point Veteran Preference',
                            'VA letter (dated within the last 12 months) confirming your service-connected disability rating of 10% or 20%.'
                        ],
                        opmLinks: [
                             { text: '10-Point (Compensable) Preference', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#cp' }
                        ]
                    }
                },
                {
                    answerText: 'Yes, rated 0% (less than 10%) OR I received a Purple Heart (without a 30%+ disability)',
                     resultOutcome: {
                        type: 'eligible-10-point', // XP
                        title: 'Eligible for 10-Point Preference (XP)',
                        description: 'You appear to be eligible for 10-point disability preference (XP). This could be due to a 0% service-connected disability or receipt of the Purple Heart.',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation (must show Purple Heart if claiming based on that)',
                            'SF-15 Application for 10-Point Veteran Preference',
                            'If 0% disability: VA letter (dated within the last 12 months) confirming your 0% service-connected disability.'
                        ],
                        opmLinks: [
                             { text: '10-Point (Disability/XP) Preference', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' }
                        ]
                    }
                },
                {
                    answerText: 'No VA-rated service-connected disability and no Purple Heart',
                    resultOutcome: { // This assumes prior questions (like SERVICE_DATES) established honorable service in a qualifying period/campaign for 5-point.
                        type: 'eligible-5-point',
                        title: 'Eligible for 5-Point Preference (TP)',
                        description: 'Based on your qualifying military service (e.g., wartime, campaign medal, or specific service period) and honorable discharge, you appear to be eligible for 5-point preference (TP).',
                        requiredDocuments: [
                            'DD-214 or equivalent discharge documentation (showing qualifying service period/medal and character of discharge)'
                        ],
                        opmLinks: [
                            { text: '5-Point Preference Information', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#5pointtp' }
                        ]
                    }
                }
            ]
        },
        
        'FAMILY_RELATIONSHIP': {
            id: 'FAMILY_RELATIONSHIP',
            questionText: 'What is your relationship to the veteran?',
            helpText: 'Certain family members may be eligible for "derivative preference" based on the veteran\'s service.',
            answers: [
                {
                    answerText: 'Spouse or Unremarried Widow(er)',
                    nextQuestionId: 'SPOUSE_ELIGIBILITY'
                },
                {
                    answerText: 'Mother',
                    nextQuestionId: 'MOTHER_ELIGIBILITY' // Needs definition
                },
                {
                    answerText: 'Child',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference',
                        description: 'Children of veterans are not eligible for derivative preference. Only spouses/unremarried widow(er)s and mothers of certain veterans qualify.',
                        additionalInfo: [
                            'The veteran themselves may be eligible for preference',
                            'Other veteran family benefits may be available through VA'
                        ]
                    }
                },
                {
                    answerText: 'Other family member',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference',
                        description: 'Only spouses/unremarried widow(er)s and mothers of certain disabled or deceased veterans are eligible for derivative preference.',
                        additionalInfo: [
                            'The veteran themselves should apply for their own preference',
                            'Check with VA for other family member benefits'
                        ]
                    }
                }
            ]
        },
        
        'SPOUSE_ELIGIBILITY': {
            id: 'SPOUSE_ELIGIBILITY',
            questionText: 'Regarding the veteran you are related to, which of these situations applies?',
            helpText: 'Spouses or unremarried widow(er)s may be eligible for derivative preference under specific circumstances.',
            answers: [
                {
                    answerText: 'The veteran is living and has a VA-certified service-connected disability that permanently and totally disqualifies them for employment along the general lines of their usual occupation (e.g., 100% P&T or IU).',
                    resultOutcome: {
                        type: 'eligible-10-point-derivative', // XP
                        title: 'Potentially Eligible for 10-Point Derivative Preference (XP) - Spouse',
                        description: 'As the spouse of a living veteran with a 100% permanent and total service-connected disability (or rated IU) that prevents them from working, you may be eligible for 10-point derivative preference.',
                        requiredDocuments: [
                            'Your marriage certificate to the veteran.',
                            'Veteran\'s DD-214 (or equivalent).',
                            'SF-15 Application for 10-Point Veteran Preference.',
                            'VA letter (dated within 12 months) confirming the veteran\'s 100% permanent and total service-connected disability OR unemployability (IU) status.',
                            'Statement certifying the veteran is unemployed and unable to work in their usual occupation due to the disability.'
                        ],
                        opmLinks: [ { text: 'Derivative Preference for Spouses', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' } ]
                    }
                },
                {
                    answerText: 'The veteran is deceased, and their death was service-connected OR they served during specific wartime/campaign periods and you are unremarried.',
                    resultOutcome: {
                        type: 'eligible-10-point-derivative', // XP
                        title: 'Potentially Eligible for 10-Point Derivative Preference (XP) - Widow(er)',
                        description: 'As the unremarried widow(er) of a deceased veteran (whose death was service-connected or who served in qualifying periods), you may be eligible for 10-point derivative preference.',
                        requiredDocuments: [
                            'Your marriage certificate to the veteran.',
                            'Veteran\'s death certificate.',
                            'Veteran\'s DD-214 (or equivalent).',
                            'SF-15 Application for 10-Point Veteran Preference.',
                            'If death was service-connected, VA documentation confirming this.',
                            'Statement certifying you have not remarried.'
                        ],
                        opmLinks: [ { text: 'Derivative Preference for Widow(er)s', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' } ]
                    }
                },
                {
                    answerText: 'The veteran is living, but their disability is less than 100% P&T or does not prevent them from working.',
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference (Spouse)',
                        description: 'Derivative preference for spouses of *living* veterans generally requires the veteran to have a 100% permanent and total service-connected disability (or be rated IU by VA) that prevents them from working. The veteran should claim their own preference.',
                        additionalInfo: [ 'The veteran may be eligible for their own preference. They should use this tool or consult OPM guidance.' ]
                    }
                },
                {
                    answerText: 'The veteran is deceased, but their death was not service-connected AND they did not serve during a qualifying wartime/campaign period.',
                     resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference (Widow(er))',
                        description: 'Derivative preference for widow(er)s typically requires the veteran\'s death to be service-connected or for the veteran to have served during specific wartime/campaign periods if the death was not service-connected.',
                        opmLinks: [ { text: 'Derivative Preference Rules', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' } ]
                    }
                },
                {
                    answerText: "I am remarried (after the veteran's death).",
                    resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Derivative Preference',
                        description: 'Remarriage (unless the remarriage was annulled) generally terminates eligibility for derivative preference as a widow(er).',
                    }
                }
            ]
        },
        // Placeholder for nodes that are referenced but not yet fully defined in the original snippet
        // These would need to be fleshed out similar to the above nodes.
        'ACTIVE_DUTY_STATUS': {
            id: 'ACTIVE_DUTY_STATUS',
            questionText: 'Are you within 120 days of separation or retirement (VOW Act eligible)?',
            answers: [
                { answerText: 'Yes', resultOutcome: { type: 'info', title: 'Active Duty (VOW Act)', description: 'You can apply for federal jobs. You\'ll need a certification letter from your command and must provide DD-214 upon separation.' } },
                { answerText: 'No, more than 120 days out', resultOutcome: { type: 'info', title: 'Active Duty (Future)', description: 'You can prepare now. Apply once within 120 days of separation under VOW Act provisions.' } }
            ]
        },
        'RETIREMENT_TYPE': {
            id: 'RETIREMENT_TYPE',
            questionText: 'What was your rank at retirement?',
            answers: [
                { answerText: 'Below Major/Lt. Commander (O-4)', nextQuestionId: 'DISCHARGE_TYPE' }, // Assuming discharge type is still relevant for retirees if not disabled
                { answerText: 'Major/Lt. Commander (O-4) or above', nextQuestionId: 'RETIRED_OFFICER_DISABILITY' }
            ]
        },
        'RETIRED_OFFICER_DISABILITY': {
            id: 'RETIRED_OFFICER_DISABILITY',
            questionText: 'Are you a disabled veteran (i.e., do you have a service-connected disability)?',
            answers: [
                { answerText: 'Yes', nextQuestionId: 'DISABILITY_STATUS' }, // Go to general disability questions
                { answerText: 'No', resultOutcome: { type: 'not-eligible', title: 'Not Eligible (Retired O-4+ without Disability)', description: 'Retired officers at O-4 or above are generally only eligible for Veterans\' Preference if they are disabled veterans.'} }
            ]
        },
        'RESERVE_STATUS': {
            id: 'RESERVE_STATUS',
            questionText: 'Have you served on active duty (not active duty for training) under Title 10 or Title 32 (federally funded)?',
            answers: [
                { answerText: 'Yes', nextQuestionId: 'DISCHARGE_TYPE' }, // If they had active duty periods
                { answerText: 'No, only Active Duty for Training or Inactive Duty Training', nextQuestionId: 'RESERVE_DISABILITY_CHECK' }
            ]
        },
        'RESERVE_DISABILITY_CHECK': {
            id: 'RESERVE_DISABILITY_CHECK',
            questionText: 'Did you incur or aggravate a disability during any period of military service (including training)?',
            answers: [
                { answerText: 'Yes, and it is VA-rated service-connected', nextQuestionId: 'DISABILITY_STATUS'},
                { answerText: 'No', resultOutcome: { type: 'not-eligible', title: 'Not Eligible (Reserve/Guard without Qualifying Active Duty or Disability)', description: 'Reserve/Guard service primarily consisting of training without qualifying active duty periods or a service-connected disability generally does not confer Veterans\' Preference.'}}
            ]
        },
        'ENTRY_LEVEL_SERVICE': {
            id: 'ENTRY_LEVEL_SERVICE',
            questionText: 'How long did you serve before receiving an Uncharacterized or Entry Level Separation?',
             helpText: 'This typically occurs within the first 180 days of service.',
            answers: [
                { answerText: 'Less than 180 days, and no service-connected disability incurred', resultOutcome: { type: 'not-eligible', title: 'Not Eligible (Entry Level Separation)', description: 'An uncharacterized or entry-level separation with less than 180 days of service generally does not qualify for Veterans\' Preference unless a service-connected disability was incurred.' } },
                { answerText: 'Served 180 days or more OR incurred a service-connected disability', nextQuestionId: 'DISABILITY_STATUS' } // Treat as potentially eligible, disability is key
            ]
        },
        // Example of a more complex node that might be needed for SERVICE_DATES refinement
        'DISABILITY_STATUS_PEACETIME_CHECK': {
            id: 'DISABILITY_STATUS_PEACETIME_CHECK',
            questionText: 'Do you have a VA-rated service-connected disability or did you receive a campaign/expeditionary medal for that peacetime service?',
            answers: [
                { answerText: 'Yes, I have a service-connected disability rated by VA.', nextQuestionId: 'DISABILITY_STATUS'}, // Re-route to the main disability path
                { answerText: 'Yes, I received a campaign/expeditionary medal.', resultOutcome: {
                        type: 'eligible-5-point',
                        title: 'Eligible for 5-Point Preference (TP)',
                        description: 'Receipt of a campaign or expeditionary medal qualifies you for 5-point preference, even for peacetime service.',
                        requiredDocuments: ['DD-214 showing the campaign/expeditionary medal and honorable discharge.'],
                        opmLinks: [{ text: '5-Point Preference (Campaign Medal)', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#campaignmedal' }]
                    }
                },
                { answerText: 'No to both.', resultOutcome: {
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: 'Peacetime service without a campaign medal or a service-connected disability generally does not qualify for Veterans\' Preference.',
                    }
                }
            ]
        },
        'MOTHER_ELIGIBILITY': {
            id: 'MOTHER_ELIGIBILITY',
            questionText: 'Which situation applies to the veteran (your son or daughter)?',
            answers: [
                {
                    answerText: 'My veteran son/daughter died under honorable conditions while on active duty during a war, specific qualifying period, or campaign.',
                    nextQuestionId: 'MOTHER_MARITAL_STATUS'
                },
                {
                    answerText: 'My veteran son/daughter has a permanent and total service-connected disability.',
                    nextQuestionId: 'MOTHER_MARITAL_STATUS'
                },
                {
                    answerText: 'None of the above apply to the veteran.',
                    resultOutcome: { type: 'not-eligible', title: 'Not Eligible (Mother)', description: 'The veteran\'s service or disability status does not meet the criteria for mother\'s derivative preference.' }
                }
            ]
        },
        'MOTHER_MARITAL_STATUS': {
            id: 'MOTHER_MARITAL_STATUS',
            questionText: 'What is your current marital status and relation to the veteran\'s father?',
            helpText: 'Eligibility for mothers has specific conditions related to marital status.',
            answers: [
                {
                    answerText: 'I am widowed (from the veteran\'s father or a subsequent marriage) OR divorced/legally separated and have not remarried since.',
                    resultOutcome: {
                        type: 'eligible-10-point-derivative', title: 'Potentially Eligible for 10-Point Derivative Preference (XP) - Mother',
                        description: 'You may be eligible for 10-point derivative preference as the mother of a qualifying deceased or disabled veteran, based on your marital status.',
                        requiredDocuments: [
                            'Your birth certificate (or veteran\'s showing you as mother).',
                            'Veteran\'s DD-214 and/or death certificate or VA disability letter.',
                            'SF-15 Application for 10-Point Veteran Preference.',
                            'Marriage certificate to veteran\'s father; Death certificate/divorce decree for relevant spouse(s).'
                        ],
                        opmLinks: [{ text: 'Derivative Preference for Mothers', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' }]
                    }
                },
                {
                    answerText: 'I am currently married, and my current husband is permanently and totally disabled.',
                     resultOutcome: {
                        type: 'eligible-10-point-derivative', title: 'Potentially Eligible for 10-Point Derivative Preference (XP) - Mother',
                        description: 'You may be eligible for 10-point derivative preference as the mother of a qualifying deceased or disabled veteran, if your current husband is permanently and totally disabled.',
                        requiredDocuments: [ /* Similar to above, plus proof of husband's disability */ ],
                        opmLinks: [{ text: 'Derivative Preference for Mothers', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' }]
                    }
                },
                {
                    answerText: 'I am currently married, and my current husband is NOT permanently and totally disabled.',
                    resultOutcome: { type: 'not-eligible', title: 'Not Eligible (Mother)', description: 'If you are currently married and your husband is not permanently and totally disabled, you generally do not qualify for mother\'s derivative preference.' }
                }
            ]
        }
        // Ensure all nextQuestionId values point to a defined node in vetPreferenceTree
    };

    // DOM elements
    let elements = {};

    // Animation timing
    const ANIMATION_DURATION = 300;

    // Initialize the tool
    function init() {
        elements = {
            disclaimerTextContainer: document.querySelector('#question-area'), // Initial disclaimer text is here
            acceptButton: document.getElementById('accept-disclaimer'),
            toolInterface: document.getElementById('tool-interface'),
            questionArea: document.getElementById('#question-area'), // Will be reused for questions
            answersArea: document.getElementById('answers-area'),   // Will be reused for answers
            resultArea: document.getElementById('result-area'),
            progressContainer: document.querySelector('.tool-progress'), // Select the container
            progressBar: document.querySelector('.progress-bar'),
            currentStepText: document.getElementById('current-step'), // Renamed for clarity
            totalStepsText: document.getElementById('total-steps'),   // Renamed for clarity
            backButton: document.getElementById('back-button'),
            restartButton: document.getElementById('restart-button'),
            printButton: document.getElementById('print-button')
        };

        // Add fade-element class to elements that will be faded
        elements.disclaimerTextContainer?.classList.add('fade-element');
        elements.questionArea?.classList.add('fade-element');
        elements.answersArea?.classList.add('fade-element');
        elements.resultArea?.classList.add('fade-element');
        elements.progressContainer?.classList.add('fade-element');
        elements.backButton?.classList.add('fade-element');
        elements.printButton?.classList.add('fade-element');

        if (elements.acceptButton) {
            elements.acceptButton.addEventListener('click', startTool);
        }
        
        if (elements.restartButton) {
            elements.restartButton.addEventListener('click', restartTool);
        }
        
        if (elements.backButton) {
            elements.backButton.addEventListener('click', goBack);
        }
        
        if (elements.printButton) {
            elements.printButton.addEventListener('click', printResults);
        }

        document.addEventListener('keydown', handleKeyboardNavigation);
        state.totalSteps = countTotalSteps(); // Estimate total steps
        if (elements.totalStepsText) {
            elements.totalStepsText.textContent = state.totalSteps;
        }
    }

    function countTotalSteps() {
        // This is a simplified way to estimate. A more accurate way would be to find the longest path.
        // For now, let's estimate based on the number of questions defined.
        // A more robust method would traverse the tree.
        return Object.keys(vetPreferenceTree).length > 5 ? 10 : 5; // Placeholder, adjust as tree grows.
    }


    function handleKeyboardNavigation(event) {
        if (state.animating) return;

        const answerButtons = elements.answersArea ? Array.from(elements.answersArea.querySelectorAll('.answer-option:not([disabled])')) : [];
        if (answerButtons.length === 0 && event.target.id !== 'accept-disclaimer') return;


        const focusedElement = document.activeElement;
        let currentIndex = -1;

        if (focusedElement.classList.contains('answer-option')) {
            currentIndex = answerButtons.indexOf(focusedElement);
        } else if (focusedElement.id === 'accept-disclaimer') {
            // Allow Enter/Space for the accept button
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                focusedElement.click();
            }
            return;
        }


        switch(event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                if (answerButtons.length > 0) {
                    const nextIndex = (currentIndex + 1) % answerButtons.length;
                    answerButtons[nextIndex].focus();
                }
                break;
            
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                 if (answerButtons.length > 0) {
                    const prevIndex = (currentIndex - 1 + answerButtons.length) % answerButtons.length;
                    answerButtons[prevIndex].focus();
                }
                break;
            
            case 'Enter':
            case ' ':
                if (focusedElement.classList.contains('answer-option')) {
                    event.preventDefault();
                    focusedElement.click();
                }
                break;
            
            case 'Escape':
                if (state.history.length > 0 && elements.backButton && !elements.backButton.classList.contains('hidden')) {
                    event.preventDefault();
                    goBack();
                }
                break;
        }
    }
    
    function startTool() {
        if (state.animating) return;
        state.animating = true;

        const elementsToFadeOut = [];
        // Ensure we are targeting the correct initial elements for fade out
        if (elements.disclaimerTextContainer && elements.disclaimerTextContainer.querySelector('h2').textContent === "Important Notice") {
             elementsToFadeOut.push(elements.disclaimerTextContainer);
        }
        if (elements.answersArea && elements.answersArea.contains(elements.acceptButton)) {
            elementsToFadeOut.push(elements.answersArea); // Fade out the area containing the accept button
        }


        Promise.all(elementsToFadeOut.map(el => fadeOut(el))).then(() => {
            if (elements.disclaimerTextContainer) elements.disclaimerTextContainer.innerHTML = ''; // Clear disclaimer
            if (elements.answersArea) elements.answersArea.innerHTML = ''; // Clear accept button

            if (elements.progressContainer && elements.progressContainer.classList.contains('hidden')) {
                elements.progressContainer.classList.remove('hidden');
                fadeIn(elements.progressContainer);
            }
            
            state.animating = false;
            displayQuestion('START');
        }).catch(error => {
            console.error("Error fading out initial elements:", error);
            state.animating = false;
            displayQuestion('START'); // Attempt to display question anyway
        });
    }


    function displayQuestion(questionId) {
        if (state.animating && state.currentQuestionId === questionId) return; // Prevent re-triggering for the same question if already animating it
        if (state.animating && state.currentQuestionId !== questionId) {
            // If animating something else, queue or wait. For simplicity, we'll just block.
             console.warn("Animation in progress, blocking new question display for:", questionId);
            return;
        }
        
        const question = vetPreferenceTree[questionId];
        if (!question) {
            console.error('Question not found:', questionId);
            if (elements.questionArea) elements.questionArea.innerHTML = '<p class="error-message">An error occurred. Please restart the tool.</p>';
            return;
        }

        state.animating = true;
        state.currentQuestionId = questionId; // Set current question ID early
        
        if(state.history[state.history.length-1] !== questionId && questionId !== 'START') {
            // This logic might need adjustment if we are not pushing to history BEFORE displayQuestion
            // For now assume if we are going forward, step increases.
            // state.currentStep = Math.min(state.currentStep + 1, state.totalSteps); 
        }
        // If it's the first question after START, currentStep should be 1.
        // CurrentStep update is now better handled in handleAnswer for forward, and goBack for backward.
        // For initial START, currentStep is 0, after first answer it becomes 1.
        if (questionId === 'START' && state.history.length === 0) {
            state.currentStep = 0; // Special case for the very first display (progress bar starts before first answer)
        }


        const fadeOutPromises = [];
        if (elements.questionArea && !elements.questionArea.classList.contains('hidden') && elements.questionArea.innerHTML !== '') {
            fadeOutPromises.push(fadeOut(elements.questionArea));
        }
        if (elements.answersArea && !elements.answersArea.classList.contains('hidden') && elements.answersArea.innerHTML !== '') {
            fadeOutPromises.push(fadeOut(elements.answersArea));
        }
        if (elements.resultArea && !elements.resultArea.classList.contains('hidden')) {
            fadeOutPromises.push(fadeOut(elements.resultArea));
        }

        Promise.all(fadeOutPromises).then(() => {
            if (elements.questionArea) {
                elements.questionArea.innerHTML = '';
                elements.questionArea.classList.remove('hidden');
            }
            if (elements.answersArea) {
                elements.answersArea.innerHTML = '';
                elements.answersArea.classList.remove('hidden');
            }
            if (elements.resultArea) elements.resultArea.classList.add('hidden');
            
            updateProgress();
            
            const questionHTML = `
                <h2 class="animate-slide-in">${question.questionText}</h2>
                ${question.helpText ? `<p class="help-text animate-fade-in">${question.helpText}</p>` : ''}
            `;
            if (elements.questionArea) elements.questionArea.innerHTML = questionHTML;
            
            if (elements.answersArea) {
                question.answers.forEach((answer, index) => {
                    const button = document.createElement('button');
                    button.className = 'answer-option animate-slide-in';
                    button.style.animationDelay = `${index * 50}ms`;
                    button.textContent = answer.answerText;
                    button.setAttribute('data-answer-index', index);
                    button.addEventListener('click', (event) => handleAnswer(answer, event.target));
                    elements.answersArea.appendChild(button);
                });
            }
            
            if (elements.backButton) {
                if (state.history.length > 0) {
                    elements.backButton.classList.remove('hidden');
                } else {
                    elements.backButton.classList.add('hidden');
                }
            }

            const fadeInPromises = [];
            if(elements.questionArea) fadeInPromises.push(fadeIn(elements.questionArea));
            if(elements.answersArea) fadeInPromises.push(fadeIn(elements.answersArea));

            Promise.all(fadeInPromises).then(() => {
                setTimeout(() => {
                    const firstAnswer = elements.answersArea?.querySelector('.answer-option');
                    if (firstAnswer) {
                        firstAnswer.focus();
                    } else if (elements.questionArea) {
                        // If no answer options (e.g., info-only question), focus the question heading
                        elements.questionArea.querySelector('h2')?.focus();
                    }
                    state.animating = false;
                }, 50); // Shorter delay after fade-in to set focus
            });
        }).catch(err => {
            console.error("Error during question display transition:", err);
            state.animating = false; // Ensure animating is reset on error
        });
    }


    function handleAnswer(answer, clickedButtonElement) {
        if (state.animating) return;

        state.animating = true; // This action (handleAnswer) is now an animating sequence

        if (clickedButtonElement) {
            clickedButtonElement.classList.add('answer-clicked');
        }
        
        if (state.answers[state.currentQuestionId] !== answer.answerText) { // Only advance if it's a new choice for this question
            state.answers[state.currentQuestionId] = answer.answerText;
            state.history.push(state.currentQuestionId);
            state.currentStep = Math.min(state.history.length, state.totalSteps); // currentStep is number of questions answered
        } else if (!answer.nextQuestionId && !answer.resultOutcome) {
             // If same answer is clicked which has no next step, avoid pushing to history again
             // but allow processing if it leads to a result (e.g. informational clicks)
        }


        setTimeout(() => {
            state.animating = false; 

            if (answer.nextQuestionId) {
                displayQuestion(answer.nextQuestionId);
            } else if (answer.resultOutcome) {
                // Before displaying result, ensure currentStep reflects being at the end.
                state.currentStep = state.totalSteps;
                displayResult(answer.resultOutcome);
            } else {
                console.warn('Answer does not lead to a next question or result:', answer);
                if (elements.questionArea) elements.questionArea.innerHTML = '<p class="error-message">Configuration error. Next step not defined.</p>';
            }
        }, 200); // Duration of click pulse / visual delay
    }


    function displayResult(result) {
        if (state.animating) return;
        state.animating = true;

        // state.currentStep should be totalSteps when result is shown
        updateProgress(); // Ensure progress bar is full

        Promise.all([
            fadeOut(elements.questionArea),
            fadeOut(elements.answersArea)
        ]).then(() => {
            if (elements.questionArea) elements.questionArea.classList.add('hidden');
            if (elements.answersArea) elements.answersArea.classList.add('hidden');
            
            if (elements.resultArea) {
                elements.resultArea.classList.remove('hidden');
                elements.resultArea.className = `tool-result ${result.type || 'info'} animate-fade-in`;
                
                let resultHTML = `<div class="result-content">
                                    <h2 class="animate-slide-in">${result.title}</h2>
                                    <p class="animate-fade-in" style="animation-delay: 100ms">${result.description}</p>`;
                
                if (result.requiredDocuments && result.requiredDocuments.length > 0) {
                    resultHTML += `<div class="result-documents animate-slide-in" style="animation-delay: 200ms">
                                    <h3>Required Documents:</h3>
                                    <ul>${result.requiredDocuments.map((doc, i) => `<li class="animate-fade-in" style="animation-delay: ${300 + i * 50}ms">${doc}</li>`).join('')}</ul>
                                   </div>`;
                }
                if (result.additionalInfo && result.additionalInfo.length > 0) {
                    resultHTML += `<div class="result-details animate-slide-in" style="animation-delay: 300ms">
                                    <h3>Additional Information:</h3>
                                    <ul>${result.additionalInfo.map((info, i) => `<li class="animate-fade-in" style="animation-delay: ${400 + i * 50}ms">${info}</li>`).join('')}</ul>
                                   </div>`;
                }
                if (result.opmLinks && result.opmLinks.length > 0) {
                    resultHTML += `<div class="result-links animate-slide-in" style="animation-delay: 400ms">
                                    <h3>Official Resources:</h3>
                                    <ul>${result.opmLinks.map((link, i) => `<li class="animate-fade-in" style="animation-delay: ${500 + i * 50}ms"><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>`).join('')}</ul>
                                   </div>`;
                }
                resultHTML += `</div>`;
                
                if (result.type && result.type.includes('eligible') && !result.type.includes('not-eligible')) {
                    resultHTML = `<div class="success-icon animate-success">
                                    <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="26" cy="26" r="25" fill="none" />
                                        <path d="M14.1 27.2l7.1 7.2 16.7-16.8" fill="none" />
                                    </svg>
                                  </div>` + resultHTML;
                }
                
                elements.resultArea.innerHTML = resultHTML;

                if (elements.printButton) {
                    elements.printButton.classList.remove('hidden');
                }
                if (elements.backButton) {
                     elements.backButton.classList.add('hidden'); // No going back from final result via 'back'
                }
                // Set focus to the result area or its main heading
                const resultHeading = elements.resultArea?.querySelector('h2');
                if (resultHeading) {
                    resultHeading.setAttribute('tabindex', '-1'); // Make it focusable
                    resultHeading.focus();
                }
            }
            setTimeout(() => { state.animating = false; }, ANIMATION_DURATION);
        }).catch(err => {
            console.error("Error during result display transition:", err);
            state.animating = false;
        });
    }

    function updateProgress() {
        const progress = state.totalSteps > 0 ? (state.currentStep / state.totalSteps) * 100 : 0;

        if (elements.progressBar) {
            elements.progressBar.style.width = `${Math.min(progress, 100)}%`; // Cap at 100%
        }
        if (elements.currentStepText && elements.totalStepsText) {
            // Animate number change for currentStepText
             const currentDisplayedStep = parseInt(elements.currentStepText.textContent) || 0;
             // Only animate if the value is actually changing
             if (currentDisplayedStep !== state.currentStep) {
                animateValue(elements.currentStepText, currentDisplayedStep, state.currentStep, ANIMATION_DURATION);
             } else {
                 // If not animating, set directly, ensuring it doesn't exceed totalSteps
                 elements.currentStepText.textContent = Math.min(state.currentStep, state.totalSteps);
             }
             elements.totalStepsText.textContent = state.totalSteps;
        }
        
        const progressContainer = elements.progressContainer;
        if (progressContainer) {
            progressContainer.setAttribute('aria-valuenow', Math.round(Math.min(progress, 100)));
        }
    }


    function animateValue(element, start, end, duration) {
        if (!element) return;
        const range = end - start;
        if (range === 0) { // No change needed
             if (element.textContent !== String(end)) element.textContent = end;
             return;
        }
        const startTime = performance.now();
        
        function frame(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.floor(start + range * progress);
            element.textContent = value;
            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }
        requestAnimationFrame(frame);
    }


    function fadeIn(element) {
        return new Promise(resolve => {
            if (!element) { resolve(); return; }
            element.classList.remove('hidden');
            // Force reflow to ensure the transition plays
            element.offsetHeight; 
            element.classList.add('is-visible');
            element.addEventListener('transitionend', function handler() {
                element.removeEventListener('transitionend', handler);
                resolve();
            }, { once: true });
        });
    }

    function fadeOut(element) {
        return new Promise(resolve => {
            if (!element || element.classList.contains('hidden')) { resolve(); return; }
            element.classList.remove('is-visible');
            element.addEventListener('transitionend', function handler() {
                element.removeEventListener('transitionend', handler);
                element.classList.add('hidden');
                resolve();
            }, { once: true });
        });
    }

    function goBack() {
        if (state.animating || state.history.length === 0) return;
        
        // Remove the current question from history and its answer
        const currentQuestionId = state.history.pop();
        delete state.answers[currentQuestionId];

        // Determine the ID of the question to go back to
        const previousQuestionId = state.history.length > 0 ? state.history[state.history.length - 1] : 'START';
        
        // Update current step based on history length
        state.currentStep = state.history.length;
        
        // Display the previous question. displayQuestion will handle focus.
        displayQuestion(previousQuestionId);
    }


    function restartTool() {
        if (state.animating) return;
        state.animating = true; // Prevent clicks during restart transition

        // Reset state
        state.currentQuestionId = null;
        state.history = [];
        state.answers = {};
        state.currentStep = 0;
        
        const uiElementsToReset = [elements.questionArea, elements.answersArea, elements.resultArea, elements.printButton];
        if (elements.progressContainer) elements.progressContainer.classList.add('hidden'); // Hide progress bar immediately


        Promise.all(uiElementsToReset.map(el => el ? fadeOut(el) : Promise.resolve())).then(() => {
            // After fadeOut, ensure elements are ready for re-population
            if (elements.questionArea) elements.questionArea.innerHTML = '';
            if (elements.answersArea) elements.answersArea.innerHTML = '';
            if (elements.resultArea) elements.resultArea.innerHTML = '';
            if (elements.printButton) elements.printButton.classList.add('hidden');
            if (elements.backButton) elements.backButton.classList.add('hidden');

            // Restore initial disclaimer and button state.
            if (elements.questionArea && elements.acceptButton) {
                elements.questionArea.innerHTML = `<h2>Important Notice</h2>
                                                 <p><strong>This tool provides guidance based on the OPM Vet Guide for HR Professionals. It is for informational purposes only and is NOT an official determination of eligibility or a legal document.</strong></p>
                                                 <p>Always refer to official OPM documentation and consult with your agency's HR department or a Veterans Service Officer for definitive determinations.</p>`;
                elements.answersArea.innerHTML = ''; // Clear any previous answers
                elements.answersArea.appendChild(elements.acceptButton); // Re-add the accept button

                Promise.all([
                    fadeIn(elements.questionArea),
                    fadeIn(elements.answersArea)
                ]).then(() => {
                    if (elements.acceptButton) {
                        elements.acceptButton.focus(); // Set focus to the accept button
                    }
                    state.animating = false; // Reset after restart completion
                });
            } else {
                state.animating = false; // Ensure animating is reset even if no elements to fade in
            }
        }).catch(err => {
            console.error("Error during tool restart:", err);
            state.animating = false; // Ensure reset on error
        });
    }


    function printResults() {
        window.print();
    }

    document.addEventListener('DOMContentLoaded', init);

})();
