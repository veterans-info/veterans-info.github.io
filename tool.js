// Veterans' Preference Interactive Tool Logic
(function() {
    'use strict';

    // Centralized State Management
    const stateManager = {
        state: {
            currentQuestionId: null,
            answerPath: [],           // Array of {questionId, answerId, answerText}
            answers: {},              // Map of questionId -> answerText for quick lookup
            computedEligibility: null,
            debugInfo: {
                pathTaken: [],
                decisionsSkipped: [],
                warnings: []
            },
            totalSteps: 0, // Will be set during init
            currentStep: 0,
            animating: false
        },

        // Initialize state with total steps
        init: function(totalSteps) {
            this.state.totalSteps = totalSteps;
            this.state.currentQuestionId = null;
            this.state.answerPath = [];
            this.state.answers = {};
            this.state.computedEligibility = null;
            this.state.debugInfo = {
                pathTaken: [],
                decisionsSkipped: [],
                warnings: []
            };
            this.state.currentStep = 0;
            this.state.animating = false;
        },
        
        // Advance to a new question, recording the answer
        advanceToQuestion: function(questionId, answeredQuestionId = null, answerText = null) {
            if (answeredQuestionId && answerText) {
                this.state.answerPath.push({
                    questionId: answeredQuestionId,
                    answerText: answerText,
                    timestamp: Date.now()
                });
                this.state.answers[answeredQuestionId] = answerText; // Update answers map
            }
            
            this.state.currentQuestionId = questionId;
            this.state.debugInfo.pathTaken.push(questionId);
            this.state.currentStep = this.state.answerPath.length; // Number of questions answered
            this.validateCurrentState();
        },
        
        // Go back one step in the history
        goBack: function() {
            if (this.state.answerPath.length === 0) return false;
            
            const lastAnswer = this.state.answerPath.pop();
            delete this.state.answers[lastAnswer.questionId]; // Remove answer from map
            
            this.state.currentQuestionId = this.state.answerPath.length > 0 
                ? this.state.answerPath[this.state.answerPath.length - 1].questionId 
                : 'START';
            this.state.currentStep = this.state.answerPath.length;
            this.state.debugInfo.pathTaken.pop(); // Remove last question from debug path
            this.validateCurrentState(); // Re-validate state after going back
            return true;
        },

        // Reset the state to initial values
        reset: function() {
            this.init(this.state.totalSteps); // Re-initialize with the same total steps
        },

        // Validate the current state based on answers
        validateCurrentState: function() {
            this.state.debugInfo.warnings = []; // Clear previous warnings
            const issues = answerValidator.validatePath(this.state.answers);
            if (issues.length > 0) {
                this.state.debugInfo.warnings.push(...issues);
            }
        },

        // Get a copy of the current answers map
        getAnswersMap: function() {
            return { ...this.state.answers };
        },

        // Set animating status
        setAnimating: function(status) {
            this.state.animating = status;
        }
    };

    // Decision tree structure

    // 1. Separate concerns - create distinct question types
    const questionTypes = {
        SINGLE_CHOICE: 'single_choice',    // Standard radio-button style
        MULTI_FACTOR: 'multi_factor',     // Questions that need multiple criteria
        VALIDATION: 'validation',          // Verify previous answers
        RESULT: 'result'                  // Terminal nodes
    };

    const vetPreferenceTree = {
        'START': {
            id: 'START',
            type: questionTypes.SINGLE_CHOICE, // Assign type to existing questions
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
                    resultId: 'HR_INFO'
                }
            ]
        },
        
        'VETERAN_STATUS': {
            id: 'VETERAN_STATUS',
            type: questionTypes.SINGLE_CHOICE,
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
            type: questionTypes.SINGLE_CHOICE,
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
                    resultId: 'OTH_DISCHARGE'
                },
                {
                    answerText: 'Bad Conduct or Dishonorable',
                    resultId: 'BAD_CONDUCT_DISHONORABLE_DISCHARGE'
                },
                {
                    answerText: 'Uncharacterized or Entry Level Separation',
                    nextQuestionId: 'ENTRY_LEVEL_SERVICE'
                }
            ]
        },
        
        'SERVICE_DATES': {
            id: 'SERVICE_DATES',
            type: questionTypes.SINGLE_CHOICE,
            questionText: 'Which of these best describes your military service?',
            helpText: 'Select the option that best matches your service period and type.',
            answers: [
                {
                    answerText: 'Wartime service (WWII, Korea, Vietnam, Gulf War, Iraq/Afghanistan)',
                    condition: 'wartime',
                    nextQuestionId: 'VERIFY_WARTIME_PERIOD' // New question for wartime verification
                },
                {
                    answerText: 'Campaign or expedition with medal (any time period)',
                    condition: 'campaign_medal',
                    nextQuestionId: 'VERIFY_CAMPAIGN_MEDAL' // New question for campaign medal verification
                },
                {
                    answerText: 'Peacetime service only (no campaign medals)',
                    condition: 'peacetime',
                    nextQuestionId: 'PEACETIME_SERVICE_CHECK' // Existing question, but now a direct path
                }
            ]
        },
        
        'DISABILITY_STATUS': {
            id: 'DISABILITY_STATUS',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Do you have a service-connected disability rated by the VA, or have you received a Purple Heart?',
            helpText: 'A service-connected disability is one that the VA has determined was caused or aggravated by your military service.',
            answers: [
                {
                    answerText: 'Yes, rated 30% or more',
                    resultId: 'DISABILITY_30_PERCENT_PLUS'
                },
                {
                    answerText: 'Yes, rated 10% or 20%',
                    resultId: 'DISABILITY_10_20_PERCENT'
                },
                {
                    answerText: 'Yes, rated 0% (less than 10%) OR I received a Purple Heart (without a 30%+ disability)',
                    resultId: 'DISABILITY_0_PERCENT_OR_PURPLE_HEART'
                },
                {
                    answerText: 'No VA-rated service-connected disability and no Purple Heart',
                    resultId: 'NO_DISABILITY_NO_PURPLE_HEART'
                }
            ]
        },
        
        'FAMILY_RELATIONSHIP': {
            id: 'FAMILY_RELATIONSHIP',
            type: questionTypes.SINGLE_CHOICE, // Assign type
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
                    resultId: 'CHILD_NOT_ELIGIBLE'
                },
                {
                    answerText: 'Other family member',
                    resultId: 'OTHER_FAMILY_NOT_ELIGIBLE'
                }
            ]
        },
        
        'SPOUSE_ELIGIBILITY': {
            id: 'SPOUSE_ELIGIBILITY',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Regarding the veteran you are related to, which of these situations applies?',
            helpText: 'Spouses or unremarried widow(er)s may be eligible for derivative preference under specific circumstances.',
            answers: [
                {
                    answerText: 'The veteran is living and has a VA-certified service-connected disability that permanently and totally disqualifies them for employment along the general lines of their usual occupation (e.g., 100% P&T or IU).',
                    resultId: 'SPOUSE_ELIGIBLE_10_PT_DERIVATIVE_LIVING_VET'
                },
                {
                    answerText: 'The veteran is deceased, and their death was service-connected OR they served during specific wartime/campaign periods and you are unremarried.',
                    resultId: 'SPOUSE_ELIGIBLE_10_PT_DERIVATIVE_DECEASED_VET'
                },
                {
                    answerText: 'The veteran is living, but their disability is less than 100% P&T or does not prevent them from working.',
                    resultId: 'SPOUSE_NOT_ELIGIBLE_LIVING_VET'
                },
                {
                    answerText: 'The veteran is deceased, but their death was not service-connected AND they did not serve during a qualifying wartime/campaign period.',
                    resultId: 'SPOUSE_NOT_ELIGIBLE_DECEASED_VET'
                },
                {
                    answerText: "I am remarried (after the veteran's death).",
                    resultId: 'SPOUSE_NOT_ELIGIBLE_REMARRIED'
                }
            ]
        },
        // New questions for Phase 1
        'VERIFY_WARTIME_PERIOD': {
            id: 'VERIFY_WARTIME_PERIOD',
            type: questionTypes.SINGLE_CHOICE,
            questionText: 'Did your wartime service include active duty during a war, campaign, or expedition for which a campaign badge or expeditionary medal was authorized?',
            helpText: 'This includes WWII, Korea, Vietnam, Gulf War, Iraq/Afghanistan, or other specific campaigns.',
            answers: [
                {
                    answerText: 'Yes',
                    nextQuestionId: 'DISABILITY_STATUS' // Leads to disability check
                },
                {
                    answerText: 'No',
                    resultId: 'WARTIME_NO_QUALIFYING_SERVICE'
                }
            ]
        },
        'VERIFY_CAMPAIGN_MEDAL': {
            id: 'VERIFY_CAMPAIGN_MEDAL',
            type: questionTypes.SINGLE_CHOICE,
            questionText: 'Did you receive a campaign badge or expeditionary medal for your service?',
            helpText: 'Examples include the Afghanistan Campaign Medal, Iraq Campaign Medal, Global War on Terrorism Expeditionary Medal, etc.',
            answers: [
                {
                    answerText: 'Yes',
                    nextQuestionId: 'DISABILITY_STATUS' // Leads to disability check
                },
                {
                    answerText: 'No',
                    resultId: 'CAMPAIGN_NO_QUALIFYING_SERVICE'
                }
            ]
        },
        // Placeholder for nodes that are referenced but not yet fully defined in the original snippet
        // These would need to be fleshed out similar to the above nodes.
        'ACTIVE_DUTY_STATUS': {
            id: 'ACTIVE_DUTY_STATUS',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Are you within 120 days of separation or retirement (VOW Act eligible)?',
            answers: [
                { answerText: 'Yes', resultId: 'ACTIVE_DUTY_VOW_ACT' },
                { answerText: 'No, more than 120 days out', resultId: 'ACTIVE_DUTY_FUTURE' }
            ]
        },
        'RETIREMENT_TYPE': {
            id: 'RETIREMENT_TYPE',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'What was your rank at retirement?',
            answers: [
                { answerText: 'Below Major/Lt. Commander (O-4)', nextQuestionId: 'DISCHARGE_TYPE' }, // Assuming discharge type is still relevant for retirees if not disabled
                { answerText: 'Major/Lt. Commander (O-4) or above', nextQuestionId: 'RETIRED_OFFICER_DISABILITY' }
            ]
        },
        'RETIRED_OFFICER_DISABILITY': {
            id: 'RETIRED_OFFICER_DISABILITY',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Are you a disabled veteran (i.e., do you have a service-connected disability)?',
            answers: [
                { answerText: 'Yes', nextQuestionId: 'DISABILITY_STATUS' }, // Go to general disability questions
                { answerText: 'No', resultId: 'RETIRED_O4_PLUS_NO_DISABILITY' }
            ]
        },
        'RESERVE_STATUS': {
            id: 'RESERVE_STATUS',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Have you served on active duty (not active duty for training) under Title 10 or Title 32 (federally funded)?',
            answers: [
                { answerText: 'Yes', nextQuestionId: 'DISCHARGE_TYPE' }, // If they had active duty periods
                { answerText: 'No, only Active Duty for Training or Inactive Duty Training', nextQuestionId: 'RESERVE_DISABILITY_CHECK' }
            ]
        },
        'RESERVE_DISABILITY_CHECK': {
            id: 'RESERVE_DISABILITY_CHECK',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Did you incur or aggravate a disability during any period of military service (including training)?',
            answers: [
                { answerText: 'Yes, and it is VA-rated service-connected', nextQuestionId: 'DISABILITY_STATUS'},
                { answerText: 'No', resultId: 'RESERVE_NO_QUALIFYING_ACTIVE_DUTY_OR_DISABILITY'}
            ]
        },
        'ENTRY_LEVEL_SERVICE': {
            id: 'ENTRY_LEVEL_SERVICE',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'How long did you serve before receiving an Uncharacterized or Entry Level Separation?',
             helpText: 'This typically occurs within the first 180 days of service.',
            answers: [
                { answerText: 'Less than 180 days, and no service-connected disability incurred', resultId: 'ENTRY_LEVEL_LESS_THAN_180_DAYS_NO_DISABILITY' },
                { answerText: 'Served 180 days or more OR incurred a service-connected disability', nextQuestionId: 'DISABILITY_STATUS' } // Treat as potentially eligible, disability is key
            ]
        },
        // Example of a more complex node that might be needed for SERVICE_DATES refinement
        'DISABILITY_STATUS_PEACETIME_CHECK': {
            id: 'DISABILITY_STATUS_PEACETIME_CHECK',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'Do you have a VA-rated service-connected disability or did you receive a campaign/expeditionary medal for that peacetime service?',
            answers: [
                { answerText: 'Yes, I have a service-connected disability rated by VA.', nextQuestionId: 'DISABILITY_STATUS'}, // Re-route to the main disability path
                { answerText: 'Yes, I received a campaign/expeditionary medal.', resultId: 'PEACETIME_CAMPAIGN_MEDAL_ELIGIBLE' },
                { answerText: 'No to both.', resultId: 'PEACETIME_NO_CAMPAIGN_NO_DISABILITY' }
            ]
        },
        'MOTHER_ELIGIBILITY': {
            id: 'MOTHER_ELIGIBILITY',
            type: questionTypes.SINGLE_CHOICE, // Assign type
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
                    resultId: 'MOTHER_NOT_ELIGIBLE_VET_STATUS'
                }
            ]
        },
        'MOTHER_MARITAL_STATUS': {
            id: 'MOTHER_MARITAL_STATUS',
            type: questionTypes.SINGLE_CHOICE, // Assign type
            questionText: 'What is your current marital status and relation to the veteran\'s father?',
            helpText: 'Eligibility for mothers has specific conditions related to marital status.',
            answers: [
                {
                    answerText: 'I am widowed (from the veteran\'s father or a subsequent marriage) OR divorced/legally separated and have not remarried since.',
                    resultId: 'MOTHER_ELIGIBLE_10_PT_DERIVATIVE_WIDOWED_DIVORCED'
                },
                {
                    answerText: 'I am currently married, and my current husband is permanently and totally disabled.',
                    resultId: 'MOTHER_ELIGIBLE_10_PT_DERIVATIVE_MARRIED_DISABLED_HUSBAND'
                },
                {
                    answerText: 'I am currently married, and my current husband is NOT permanently and totally disabled.',
                    resultId: 'MOTHER_NOT_ELIGIBLE_MARRIED_NON_DISABLED_HUSBAND'
                }
            ]
        }
        // Ensure all nextQuestionId values point to a defined node in vetPreferenceTree
    };

    // 1. Add answer validation system
    const answerValidator = {
        validatePath: (currentAnswers) => {
            // Check for logical inconsistencies
            const issues = [];
            
            // Example validation: Retired officer O-4+ without disability
            if (currentAnswers.VETERAN_STATUS === 'Retired military' && 
                currentAnswers.RETIREMENT_TYPE === 'Major/Lt. Commander (O-4) or above' &&
                currentAnswers.RETIRED_OFFICER_DISABILITY === 'No') {
                issues.push({
                    type: 'not_eligible',
                    reason: 'retired_officer_without_disability',
                    message: 'Retired officers at O-4 or above are generally only eligible for Veterans\' Preference if they are disabled veterans.'
                });
            }
            
            // Add more validation rules as needed
            // Example: If someone claims wartime service but then says no campaign medal and no disability
            // This would be more complex as it depends on the full path, not just currentAnswers
            // For now, focus on direct contradictions from currentAnswers map.

            return issues;
        }
    };

    // Phase 4: Enhance Result Generation Logic
    const resultGenerator = {
        generateResult: (answerPath) => {
            const lastAnswer = answerPath[answerPath.length - 1];
            const resultId = lastAnswer ? lastAnswer.resultId : null; // Get resultId from the last answer if it exists

            const analysis = resultGenerator.analyzeEligibility(answerPath, resultId);
            
            return {
                type: analysis.eligibilityType,
                title: resultGenerator.generateTitle(analysis),
                description: resultGenerator.generateDescription(analysis),
                reasoning: resultGenerator.generateReasoning(analysis),
                confidence: analysis.confidence,
                requiredDocuments: resultGenerator.getRequiredDocuments(analysis),
                additionalInfo: resultGenerator.getAdditionalInfo(analysis),
                opmLinks: resultGenerator.getRelevantLinks(analysis)
            };
        },
        
        analyzeEligibility: (answerPath, resultId = null) => {
            const answersMap = answerPath.reduce((acc, item) => {
                acc[item.questionId] = item.answerText;
                return acc;
            }, {});

            if (resultId === 'HR_INFO') {
                return {
                    eligibilityType: 'info',
                    confidence: 'high',
                    factors: answersMap,
                    serviceQualifies: { qualifies: false, reason: 'N/A for HR info path.' },
                    disabilityQualifies: { qualifies: false, reason: 'N/A for HR info path.' },
                    derivativeQualifies: { qualifies: false, reason: 'N/A for HR info path.' }
                };
            } else if (resultId === 'OTH_DISCHARGE' || resultId === 'BAD_CONDUCT_DISHONORABLE_DISCHARGE') {
                return {
                    eligibilityType: 'not-eligible',
                    confidence: 'high',
                    factors: answersMap,
                    serviceQualifies: { qualifies: false, reason: 'Discharge type does not qualify.' },
                    disabilityQualifies: { qualifies: false, reason: 'N/A due to discharge type.' },
                    derivativeQualifies: { qualifies: false, reason: 'N/A due to discharge type.' }
                };
            }

            let serviceQualifies = { qualifies: false, reason: 'No qualifying service found.' };
            let disabilityQualifies = { qualifies: false, reason: 'No qualifying disability found.' };
            let derivativeQualifies = { qualifies: false, reason: 'Not applicable or no derivative eligibility.' };
            let eligibilityType = 'not-eligible';
            let confidence = 'high'; // Default confidence

            // Simplified logic for demonstration. This would be much more complex in a real app.
            // Service Qualification
            const serviceDatesAnswer = answersMap['SERVICE_DATES'];
            const dischargeTypeAnswer = answersMap['DISCHARGE_TYPE'];
            const veteranStatusAnswer = answersMap['VETERAN_STATUS'];
            const disabilityStatusAnswer = answersMap['DISABILITY_STATUS'];
            const familyRelationshipAnswer = answersMap['FAMILY_RELATIONSHIP'];
            const spouseEligibilityAnswer = answersMap['SPOUSE_ELIGIBILITY'];
            const motherEligibilityAnswer = answersMap['MOTHER_ELIGIBILITY'];
            const motherMaritalStatusAnswer = answersMap['MOTHER_MARITAL_STATUS'];

            if (dischargeTypeAnswer === 'Honorable' || dischargeTypeAnswer === 'General (Under Honorable Conditions)') {
                if (serviceDatesAnswer && (serviceDatesAnswer.includes('Wartime service') || serviceDatesAnswer.includes('Campaign or expedition with medal'))) {
                    serviceQualifies = { qualifies: true, reason: 'Qualifying wartime or campaign service with honorable discharge.' };
                    eligibilityType = 'eligible-5-point'; // Base eligibility
                } else if (serviceDatesAnswer === 'Peacetime service only (no campaign medals)' && answersMap['DISABILITY_STATUS_PEACETIME_CHECK'] && answersMap['DISABILITY_STATUS_PEACETIME_CHECK'].includes('campaign/expeditionary medal')) {
                    serviceQualifies = { qualifies: true, reason: 'Peacetime service with campaign medal.' };
                    eligibilityType = 'eligible-5-point';
                }
            }

            // Handle DISABILITY_STATUS resultIds
            if (resultId === 'DISABILITY_30_PERCENT_PLUS') {
                disabilityQualifies = { qualifies: true, reason: 'VA-rated service-connected disability of 30% or more.' };
                eligibilityType = 'eligible-10-point-cps';
            } else if (resultId === 'DISABILITY_10_20_PERCENT') {
                disabilityQualifies = { qualifies: true, reason: 'VA-rated service-connected disability of 10% or 20%.' };
                eligibilityType = 'eligible-10-point'; // CP
            } else if (resultId === 'DISABILITY_0_PERCENT_OR_PURPLE_HEART') {
                disabilityQualifies = { qualifies: true, reason: 'VA-rated service-connected disability of 0% or Purple Heart.' };
                eligibilityType = 'eligible-10-point'; // XP
            } else if (resultId === 'NO_DISABILITY_NO_PURPLE_HEART') {
                // This path assumes prior questions (like SERVICE_DATES) established honorable service in a qualifying period/campaign for 5-point.
                // If service qualifies, then it's 5-point. Otherwise, it's not eligible.
                if (serviceQualifies.qualifies) {
                    eligibilityType = 'eligible-5-point';
                } else {
                    eligibilityType = 'not-eligible';
                    serviceQualifies.reason = 'No qualifying service found for 5-point preference without disability.';
                }
            }

            // Derivative Qualification
            if (familyRelationshipAnswer) {
                if (familyRelationshipAnswer.includes('Spouse or Unremarried Widow(er)')) {
                    if (spouseEligibilityAnswer && spouseEligibilityAnswer.includes('The veteran is living and has a VA-certified service-connected disability that permanently and totally disqualifies them for employment')) {
                        derivativeQualifies = { qualifies: true, reason: 'Spouse of 100% P&T disabled veteran.' };
                        eligibilityType = 'eligible-10-point-derivative';
                    } else if (spouseEligibilityAnswer && spouseEligibilityAnswer.includes('The veteran is deceased, and their death was service-connected OR they served during specific wartime/campaign periods and you are unremarried.')) {
                        derivativeQualifies = { qualifies: true, reason: 'Unremarried widow(er) of qualifying deceased veteran.' };
                        eligibilityType = 'eligible-10-point-derivative';
                    }
                } else if (familyRelationshipAnswer.includes('Mother')) {
                    if (motherEligibilityAnswer && (motherEligibilityAnswer.includes('died under honorable conditions') || motherEligibilityAnswer.includes('permanent and total service-connected disability'))) {
                        if (motherMaritalStatusAnswer && (motherMaritalStatusAnswer.includes('I am widowed') || motherMaritalStatusAnswer.includes('I am currently married, and my current husband is permanently and totally disabled.'))) {
                            derivativeQualifies = { qualifies: true, reason: 'Mother of qualifying deceased or disabled veteran with appropriate marital status.' };
                            eligibilityType = 'eligible-10-point-derivative';
                        }
                    }
                }
            }

            // Determine final eligibility type based on the strongest qualification
            if (disabilityQualifies.qualifies && eligibilityType.includes('10-point')) {
                // Keep the specific 10-point type (CPS, CP, XP)
            } else if (serviceQualifies.qualifies && eligibilityType === 'eligible-5-point') {
                // Keep 5-point if no 10-point
            } else if (derivativeQualifies.qualifies && eligibilityType.includes('derivative')) {
                // Keep derivative if applicable
            } else {
                eligibilityType = 'not-eligible'; // Default if no specific qualification met
            }

            // Refine confidence based on path complexity or missing info (placeholder)
            // if (answersMap['SOME_COMPLEX_QUESTION'] === 'Unsure') confidence = 'medium';

            return {
                eligibilityType,
                confidence,
                factors: answersMap, // Pass all answers for detailed reasoning
                serviceQualifies,
                disabilityQualifies,
                derivativeQualifies
            };
        },
        
        generateTitle: (analysis) => {
            switch (analysis.eligibilityType) {
                case 'eligible-5-point': return 'Eligible for 5-Point Preference (TP)';
                case 'eligible-10-point': return 'Eligible for 10-Point Preference (CP or XP)';
                case 'eligible-10-point-cps': return 'Eligible for 10-Point Preference (CPS)';
                case 'eligible-10-point-derivative': return 'Potentially Eligible for 10-Point Derivative Preference';
                case 'not-eligible': return 'Not Eligible for Veterans\' Preference';
                case 'info': return 'Information Only'; // For HR professional path, etc.
                default: return 'Veterans\' Preference Eligibility';
            }
        },

        generateDescription: (analysis) => {
            switch (analysis.eligibilityType) {
                case 'eligible-5-point': return 'Based on your qualifying military service and honorable discharge, you appear to be eligible for 5-point preference (TP).';
                case 'eligible-10-point': return 'Based on your service-connected disability, you appear to be eligible for 10-point preference (CP or XP).';
                case 'eligible-10-point-cps': return 'Based on your 30% or more service-connected disability, you appear to be eligible for 10-point preference (CPS).';
                case 'eligible-10-point-derivative': return 'Based on your relationship to a qualifying veteran, you may be eligible for 10-point derivative preference.';
                case 'not-eligible': return 'Based on your answers, you do not appear to be eligible for Veterans\' Preference at this time.';
                case 'info': return 'This path provides general information or resources.';
                default: return 'Review the reasoning below for details.';
            }
        },

        generateReasoning: (analysis) => {
            const reasons = [];
            if (analysis.eligibilityType.includes('eligible')) {
                if (analysis.serviceQualifies.qualifies) {
                    reasons.push(`✓ Service qualification: ${analysis.serviceQualifies.reason}`);
                }
                if (analysis.disabilityQualifies.qualifies) {
                    reasons.push(`✓ Disability qualification: ${analysis.disabilityQualifies.reason}`);
                }
                if (analysis.derivativeQualifies.qualifies) {
                    reasons.push(`✓ Derivative qualification: ${analysis.derivativeQualifies.reason}`);
                }
            } else if (analysis.eligibilityType === 'not-eligible') {
                if (!analysis.serviceQualifies.qualifies) {
                    reasons.push(`✗ Service does not qualify: ${analysis.serviceQualifies.reason}`);
                }
                if (!analysis.disabilityQualifies.qualifies) {
                    reasons.push(`✗ Disability does not qualify: ${analysis.disabilityQualifies.reason}`);
                }
                if (!analysis.derivativeQualifies.qualifies) {
                    reasons.push(`✗ Derivative status does not qualify: ${analysis.derivativeQualifies.reason}`);
                }
                // Add specific reasons for not eligible based on answers
                if (analysis.factors['DISCHARGE_TYPE'] && (analysis.factors['DISCHARGE_TYPE'].includes('Other Than Honorable') || analysis.factors['DISCHARGE_TYPE'].includes('Bad Conduct'))) {
                    reasons.push('✗ Discharge type is not honorable or general (under honorable conditions).');
                }
                if (analysis.factors['VETERAN_STATUS'] === 'Retired military' && analysis.factors['RETIREMENT_TYPE'] === 'Major/Lt. Commander (O-4) or above' && analysis.factors['RETIRED_OFFICER_DISABILITY'] === 'No') {
                    reasons.push('✗ Retired officer (O-4 or above) without a service-connected disability.');
                }
            } else if (analysis.eligibilityType === 'info') {
                reasons.push('This path provides general information and resources, not a preference eligibility determination.');
            }
            return reasons.length > 0 ? reasons : ['No specific reasoning available for this outcome.'];
        },

        getRequiredDocuments: (analysis) => {
            const docs = new Set();
            docs.add('DD-214 or equivalent discharge documentation');

            if (analysis.eligibilityType.includes('10-point') || analysis.eligibilityType.includes('derivative')) {
                docs.add('SF-15 Application for 10-Point Veteran Preference');
            }

            if (analysis.disabilityQualifies.qualifies) {
                docs.add('VA letter (dated within the last 12 months) confirming your service-connected disability rating.');
            }

            if (analysis.eligibilityType === 'eligible-10-point-cps') {
                docs.add('VA letter confirming 30% or more service-connected disability rating.');
            } else if (analysis.eligibilityType === 'eligible-10-point' && analysis.disabilityQualifies.reason.includes('10% or 20%')) {
                docs.add('VA letter confirming 10% or 20% service-connected disability rating.');
            } else if (analysis.eligibilityType === 'eligible-10-point' && analysis.disabilityQualifies.reason.includes('0%')) {
                docs.add('VA letter confirming 0% service-connected disability rating.');
            } else if (analysis.eligibilityType === 'eligible-10-point' && analysis.disabilityQualifies.reason.includes('Purple Heart')) {
                docs.add('DD-214 showing Purple Heart award.');
            }

            if (analysis.derivativeQualifies.qualifies) {
                if (analysis.factors['FAMILY_RELATIONSHIP'] === 'Spouse or Unremarried Widow(er)') {
                    docs.add('Marriage certificate to the veteran.');
                    if (analysis.factors['SPOUSE_ELIGIBILITY'] && analysis.factors['SPOUSE_ELIGIBILITY'].includes('The veteran is living and has a VA-certified service-connected disability that permanently and totally disqualifies them for employment')) {
                        docs.add('VA letter confirming veteran\'s 100% permanent and total service-connected disability OR unemployability (IU) status.');
                        docs.add('Statement certifying the veteran is unemployed and unable to work in their usual occupation due to the disability.');
                    } else if (analysis.factors['SPOUSE_ELIGIBILITY'] && analysis.factors['SPOUSE_ELIGIBILITY'].includes('The veteran is deceased, and their death was service-connected OR they served during specific wartime/campaign periods and you are unremarried.')) {
                        docs.add('Veteran\'s death certificate.');
                        docs.add('If death was service-connected, VA documentation confirming this.');
                        docs.add('Statement certifying you have not remarried.');
                    }
                } else if (analysis.factors['FAMILY_RELATIONSHIP'] === 'Mother') {
                    docs.add('Your birth certificate (or veteran\'s showing you as mother).');
                    if (analysis.factors['MOTHER_ELIGIBILITY'] && analysis.factors['MOTHER_ELIGIBILITY'].includes('died under honorable conditions')) {
                        docs.add('Veteran\'s death certificate.');
                    } else if (analysis.factors['MOTHER_ELIGIBILITY'] && analysis.factors['MOTHER_ELIGIBILITY'].includes('permanent and total service-connected disability')) {
                        docs.add('VA letter confirming veteran\'s permanent and total service-connected disability.');
                    }
                    docs.add('SF-15 Application for 10-Point Veteran Preference.');
                    docs.add('Marriage certificate to veteran\'s father; Death certificate/divorce decree for relevant spouse(s).');
                }
            }
            return Array.from(docs);
        },

        getAdditionalInfo: (analysis) => {
            const info = new Set();
            if (analysis.eligibilityType === 'not-eligible') {
                info.add('Please review your answers or consult official OPM guidance for more details.');
                if (analysis.factors['DISCHARGE_TYPE'] && (analysis.factors['DISCHARGE_TYPE'].includes('Other Than Honorable') || analysis.factors['DISCHARGE_TYPE'].includes('Bad Conduct'))) {
                    info.add('You may be able to upgrade your discharge through a military discharge review board.');
                }
            } else if (analysis.eligibilityType === 'info') {
                info.add('Review the complete OPM Vet Guide for HR Professionals.');
                info.add('Consult agency-specific policies.');
                info.add('Contact OPM for specific case guidance.');
            }
            return Array.from(info);
        },

        getRelevantLinks: (analysis) => {
            const links = new Map(); // Use Map to ensure unique links by URL
            links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/', { text: 'OPM Vet Guide for HR Professionals (Main)', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/' });

            if (analysis.eligibilityType.includes('5-point')) {
                links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#5pointtp', { text: '5-Point Preference Information', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#5pointtp' });
            } else if (analysis.eligibilityType.includes('10-point')) {
                links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#10point', { text: 'General 10-Point Preference Information', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#10point' });
                if (analysis.eligibilityType === 'eligible-10-point-cps') {
                    links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#cps', { text: '10-Point (30% or more disabled) Preference (CPS)', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#cps' });
                } else if (analysis.disabilityQualifies.reason.includes('10% or 20%')) {
                    links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#cp', { text: '10-Point (Compensable) Preference (CP)', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#cp' });
                } else if (analysis.disabilityQualifies.reason.includes('0%') || analysis.disabilityQualifies.reason.includes('Purple Heart')) {
                    links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp', { text: '10-Point (Disability/XP) Preference', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#xp' });
                }
            } else if (analysis.eligibilityType.includes('derivative')) {
                links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#derivative', { text: 'Derivative Preference Information', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#derivative' });
            }

            // Add specific links based on answers (e.g., discharge type)
            if (analysis.factors['DISCHARGE_TYPE'] && (analysis.factors['DISCHARGE_TYPE'].includes('Other Than Honorable') || analysis.factors['DISCHARGE_TYPE'].includes('Bad Conduct'))) {
                links.set('https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#discharge', { text: 'Character of Discharge Requirements', url: 'https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/#discharge' });
            }
            
            return Array.from(links.values());
        }
    };

    // 2. Add conditional question display (placeholder for now, actual implementation later)
    const questionConditions = {
        'DISABILITY_STATUS': [
            { 
                when: 'DISCHARGE_TYPE',
                equals: ['Honorable', 'General (Under Honorable Conditions)']
            }
        ],
        'RETIREMENT_TYPE': [
            {
                when: 'VETERAN_STATUS',
                equals: 'Retired military'
            }
        ]
    };

    function evaluateCondition(condition, currentAnswers) {
        const answerValue = currentAnswers[condition.when];
        if (condition.equals) {
            return Array.isArray(condition.equals) ? condition.equals.includes(answerValue) : answerValue === condition.equals;
        }
        // Add other condition types (e.g., notEquals, greaterThan, lessThan) as needed
        return true; // If no specific condition type, assume true
    }

    function shouldShowQuestion(questionId, currentAnswers) {
        const conditions = questionConditions[questionId];
        if (!conditions) return true; // No conditions, always show
        
        return conditions.every(condition => 
            evaluateCondition(condition, currentAnswers)
        );
    }

    // DOM elements
    let elements = {};

    // Animation timing
    const ANIMATION_DURATION = 300;
    const TOTAL_DEFINED_STEPS = 12; // Estimate based on the current tree depth/complexity (will be passed to stateManager)

    // Initialize the tool
    function init() {
        elements = {
            acceptButton: document.getElementById('accept-disclaimer'),
            toolInterface: document.getElementById('tool-interface'),
            questionArea: document.getElementById('question-area'), // Will be reused for questions
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
        elements.questionArea?.classList.add('fade-element');
        elements.answersArea?.classList.add('fade-element');
        elements.resultArea?.classList.add('fade-element');
        elements.progressContainer?.classList.add('fade-element');
        elements.backButton?.classList.add('fade-element');
        elements.printButton?.classList.add('fade-element');

        if (elements.questionArea) {
            elements.questionArea.classList.add('is-visible');
        }
        if (elements.answersArea) {
            elements.answersArea.classList.add('is-visible');
        }

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
        
        // Initialize stateManager
        stateManager.init(TOTAL_DEFINED_STEPS); 
        if (elements.totalStepsText) {
            elements.totalStepsText.textContent = stateManager.state.totalSteps;
        }
    }


    function handleKeyboardNavigation(event) {
        if (stateManager.state.animating) return;

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
                if (stateManager.state.answerPath.length > 0 && elements.backButton && !elements.backButton.classList.contains('hidden')) {
                    event.preventDefault();
                    goBack();
                }
                break;
        }
    }
    
    function startTool() {
        if (stateManager.state.animating) return;
        stateManager.setAnimating(true);
        setInteractiveElementsDisabled(true); // Disable elements at the start of animation

        const elementsToFadeOut = [];
        // Ensure we are targeting the correct initial elements for fade out
        if (elements.questionArea && elements.questionArea.querySelector('h2').textContent === "Important Notice") {
             elementsToFadeOut.push(elements.questionArea);
        }
        if (elements.answersArea && elements.answersArea.contains(elements.acceptButton)) {
            elementsToFadeOut.push(elements.answersArea); // Fade out the area containing the accept button
        }


        Promise.all(elementsToFadeOut.map(el => fadeOut(el))).then(() => {
            if (elements.questionArea) elements.questionArea.innerHTML = ''; // Clear disclaimer
            if (elements.answersArea) elements.answersArea.innerHTML = ''; // Clear accept button

            if (elements.progressContainer && elements.progressContainer.classList.contains('hidden')) {
                elements.progressContainer.classList.remove('hidden');
                fadeIn(elements.progressContainer);
            }
            
            stateManager.setAnimating(false);
            setInteractiveElementsDisabled(false); // Re-enable elements after animation
            displayQuestion('START');
        }).catch(error => {
            console.error("Error fading out initial elements:", error);
            stateManager.setAnimating(false);
            setInteractiveElementsDisabled(false); // Re-enable elements on error
            displayQuestion('START'); // Attempt to display question anyway
        });
    }


    function displayQuestion(questionId) {
        if (stateManager.state.animating && stateManager.state.currentQuestionId === questionId) return; // Prevent re-triggering for the same question if already animating it
        if (stateManager.state.animating && stateManager.state.currentQuestionId !== questionId) {
            // If animating something else, queue or wait. For simplicity, we'll just block.
             console.warn("Animation in progress, blocking new question display for:", questionId);
            return;
        }
        
        let question = vetPreferenceTree[questionId];
        if (!question) {
            console.error('Question not found:', questionId);
            if (elements.questionArea) elements.questionArea.innerHTML = '<p class="error-message">An error occurred. Please restart the tool.</p>';
            return;
        }

        // Check if the question should be shown based on current answers
        if (!shouldShowQuestion(questionId, stateManager.getAnswersMap())) {
            console.log(`Skipping question ${questionId} due to conditional logic.`);
            // If the question should not be shown, we need to find the next appropriate question.
            // This is a simplified approach; a more robust solution might involve
            // a more complex decision-making process to find the next valid question.
            // For now, we'll assume that if a question is skipped, it means the path
            // is invalid or leads to a specific outcome.
            // This part needs careful consideration based on the overall flow.
            // For the purpose of this phase, if a question is skipped, it implies
            // an "not eligible" outcome for that path, or it should have been
            // handled by the previous question's nextQuestionId logic.
            // Given the current structure, if a question is conditionally hidden,
            // it implies the user should not have reached it via the current path.
            // We'll treat this as an "not eligible" scenario for now, or a flow error.
            // A better approach would be to re-evaluate the next question based on the tree.

            stateManager.setAnimating(false);
            displayResult({
                type: 'not-eligible',
                title: 'Not Eligible for Veterans\' Preference',
                description: 'Based on your previous answers, this path does not lead to Veterans\' Preference eligibility.',
                additionalInfo: ['Please review your answers or consult official OPM guidance for more details.']
            });
            return;
        }

        stateManager.setAnimating(true);
        // Use stateManager.advanceToQuestion to update currentQuestionId and history
        // For initial START, we just set the currentQuestionId, no answer to record yet.
        if (questionId === 'START' && stateManager.state.answerPath.length === 0) {
            stateManager.state.currentQuestionId = questionId;
            stateManager.state.debugInfo.pathTaken.push(questionId);
            stateManager.state.currentStep = 0; // Special case for the very first display (progress bar starts before first answer)
        } else {
            // If we are displaying a question that is not START, and it's not a back navigation,
            // then advanceToQuestion should have been called by handleAnswer.
            // If this is a direct call to displayQuestion (e.g., from goBack), stateManager.currentQuestionId is already set.
            // We only need to ensure currentQuestionId is correctly set if this is the first question.
            // The advanceToQuestion handles setting currentQuestionId and currentStep for forward movement.
            // For displayQuestion, we just need to ensure stateManager.currentQuestionId is correct.
            stateManager.state.currentQuestionId = questionId;
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
                if (stateManager.state.answerPath.length > 0) {
                    elements.backButton.classList.remove('hidden');
                } else {
                    elements.backButton.classList.add('hidden');
                }
            }

            // Disable all interactive elements while animating
            setInteractiveElementsDisabled(true);

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
                    stateManager.setAnimating(false);
                    setInteractiveElementsDisabled(false); // Re-enable after animation
                    // Announce new question for screen readers
                    if (typeof announceToScreenReader === 'function') {
                        announceToScreenReader(`New question: ${question.questionText}`);
                    }
                }, 50); // Shorter delay after fade-in to set focus
            }).catch(err => {
                console.error("Error during question display transition:", err);
                stateManager.setAnimating(false); // Ensure animating is reset on error
                setInteractiveElementsDisabled(false); // Re-enable on error
            });
        }).catch(err => {
            console.error("Error during question display transition (initial fadeOut):", err);
            stateManager.setAnimating(false); // Ensure animating is reset on error
            setInteractiveElementsDisabled(false); // Re-enable on error
        });
    }

    // Helper function to disable/enable interactive elements
    function setInteractiveElementsDisabled(disabled) {
        const buttons = elements.answersArea?.querySelectorAll('button') || [];
        buttons.forEach(button => button.disabled = disabled);
        if (elements.acceptButton) elements.acceptButton.disabled = disabled;
        if (elements.backButton) elements.backButton.disabled = disabled;
        if (elements.restartButton) elements.restartButton.disabled = disabled;
        // Print button can remain enabled or be disabled based on preference
        // if (elements.printButton) elements.printButton.disabled = disabled;
    }


    function handleAnswer(answer, clickedButtonElement) {
        if (stateManager.state.animating) return;

        stateManager.setAnimating(true); // This action (handleAnswer) is now an animating sequence

        if (clickedButtonElement) {
            clickedButtonElement.classList.add('answer-clicked');
        }
        
        // Advance state and store the answer
        stateManager.advanceToQuestion(answer.nextQuestionId || stateManager.state.currentQuestionId, stateManager.state.currentQuestionId, answer.answerText);

        // Validate the current path
        const validationIssues = answerValidator.validatePath(stateManager.getAnswersMap());
        if (validationIssues.length > 0) {
            // Handle validation issues, e.g., display a warning or force a specific result
            console.warn("Validation issues detected:", validationIssues);
            // For now, we'll just log. Later, we might display a specific result or message.
            const issue = validationIssues[0]; // Take the first issue for now
            if (issue.type === 'not_eligible') {
                setTimeout(() => {
                    stateManager.setAnimating(false);
                    displayResult({
                        type: 'not-eligible',
                        title: 'Not Eligible for Veterans\' Preference',
                        description: issue.message || 'Based on your answers, you do not appear to be eligible for Veterans\' Preference.',
                        additionalInfo: ['Please review your answers or consult official OPM guidance for more details.']
                    });
                }, 200);
                return; // Stop further processing
            }
        }


        setTimeout(() => {
            stateManager.setAnimating(false); 

            if (answer.nextQuestionId) {
                displayQuestion(answer.nextQuestionId);
            } else if (answer.resultOutcome) {
                // Before displaying result, ensure currentStep reflects being at the end.
                stateManager.state.currentStep = stateManager.state.totalSteps;
                // Generate the result dynamically using the resultGenerator
                const generatedResult = resultGenerator.generateResult(stateManager.state.answerPath);
                displayResult(generatedResult);
            } else {
                console.warn('Answer does not lead to a next question or result:', answer);
                if (elements.questionArea) elements.questionArea.innerHTML = '<p class="error-message">Configuration error. Next step not defined.</p>';
            }
        }, 200); // Duration of click pulse / visual delay
    }


    function displayResult(result) {
        if (stateManager.state.animating) return;
        stateManager.setAnimating(true);

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
                // Announce result for screen readers
                if (typeof announceToScreenReader === 'function') {
                    announceToScreenReader(`Result: ${result.title}. ${result.description}`);
                }
            }
            setTimeout(() => { stateManager.setAnimating(false); }, ANIMATION_DURATION);
        }).catch(err => {
            console.error("Error during result display transition:", err);
            stateManager.setAnimating(false);
        });
    }

    function updateProgress() {
        const progress = stateManager.state.totalSteps > 0 ? (stateManager.state.currentStep / stateManager.state.totalSteps) * 100 : 0;

        if (elements.progressBar) {
            elements.progressBar.style.width = `${Math.min(progress, 100)}%`; // Cap at 100%
        }
        if (elements.currentStepText && elements.totalStepsText) {
            // Animate number change for currentStepText
             const currentDisplayedStep = parseInt(elements.currentStepText.textContent) || 0;
             // Only animate if the value is actually changing
             if (currentDisplayedStep !== stateManager.state.currentStep) {
                animateValue(elements.currentStepText, currentDisplayedStep, stateManager.state.currentStep, ANIMATION_DURATION);
             } else {
                 // If not animating, set directly, ensuring it doesn't exceed totalSteps
                 elements.currentStepText.textContent = Math.min(stateManager.state.currentStep, stateManager.state.totalSteps);
             }
             elements.totalStepsText.textContent = stateManager.state.totalSteps;
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
        if (stateManager.state.animating) return;
        
        const wentBack = stateManager.goBack();
        if (wentBack) {
            // Display the previous question. displayQuestion will handle focus.
            displayQuestion(stateManager.state.currentQuestionId);
        }
    }


    function restartTool() {
        if (stateManager.state.animating) return;
        stateManager.setAnimating(true); // Prevent clicks during restart transition
        setInteractiveElementsDisabled(true); // Disable elements at the start of animation

        stateManager.reset(); // Reset state using the stateManager
        
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
                    stateManager.setAnimating(false); // Reset after restart completion
                    setInteractiveElementsDisabled(false); // Re-enable elements after animation
                });
            } else {
                stateManager.setAnimating(false); // Ensure animating is reset even if no elements to fade in
                setInteractiveElementsDisabled(false); // Re-enable elements after animation
            }
        }).catch(err => {
            console.error("Error during tool restart:", err);
            stateManager.setAnimating(false); // Ensure reset on error
            setInteractiveElementsDisabled(false); // Re-enable on error
        });
    }


    function printResults() {
        window.print();
    }

    document.addEventListener('DOMContentLoaded', init);

})();
