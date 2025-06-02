// tool-data.js
const veteransPreferenceData = {
  questions: {
    'q1': {
      question: "Are you a veteran who served on active duty in the U.S. Armed Forces?",
      options: [
        { id: 'q1-yes', text: "Yes", next: 'q2' },
        { id: 'q1-no', text: "No", next: 'result-non-veteran' }
      ]
    },
    'q2': {
      question: "Did you serve during a war, in a campaign or expedition for which a campaign badge has been authorized, or are you a disabled veteran?",
      options: [
        { id: 'q2-yes', text: "Yes", next: 'q3-preference-type' },
        { id: 'q2-no', text: "No", next: 'result-no-preference' }
      ]
    },
    'q3-preference-type': {
      question: "Which of the following best describes your service or status?",
      options: [
        { id: 'q3-war-campaign', text: "Served during a war or in a campaign/expedition (non-disabled)", next: 'result-5-point' },
        { id: 'q3-disabled-vet', text: "Disabled veteran (10% or more disability)", next: 'q4-10-point-type' },
        { id: 'q3-purple-heart', text: "Purple Heart recipient", next: 'result-10-point-ph' }
      ]
    },
    'q4-10-point-type': {
      question: "What is your disability rating or status?",
      options: [
        { id: 'q4-10-29-percent', text: "10% or more, but less than 30%", next: 'result-10-point-cp' },
        { id: 'q4-30-plus-percent', text: "30% or more", next: 'result-10-point-cps' },
        { id: 'q4-compensable-xp', text: "Compensably disabled, but not 30% or more (e.g., XP)", next: 'result-10-point-xp' }
      ]
    }
  },
  paths: {},         // Decision paths
  results: {
    'result-non-veteran': {
      description: "Based on your answers, you are not a veteran who served on active duty. Therefore, you are generally not eligible for Veterans' Preference.",
      documentation: null,
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-1/",
        text: "OPM Vet Guide Chapter 1: Basic Eligibility Requirements"
      }
    },
    'result-no-preference': {
      description: "Based on your answers, while you are a veteran, your service may not meet the specific criteria for Veterans' Preference (e.g., service during a war, campaign, or as a disabled veteran).",
      documentation: null,
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-1/",
        text: "OPM Vet Guide Chapter 1: Basic Eligibility Requirements"
      }
    },
    'result-5-point': {
      description: "Based on your answers, you appear to be eligible for <strong>5-point Veterans' Preference (TP)</strong>. This preference is generally granted to veterans who served during a war, or in a campaign or expedition for which a campaign badge has been authorized, and who are not disabled.",
      documentation: "Typically, a DD-214, Certificate of Release or Discharge from Active Duty, showing honorable discharge and qualifying service.",
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/",
        text: "OPM Vet Guide Chapter 2: Types of Preference"
      }
    },
    'result-10-point-ph': {
      description: "Based on your answers, you appear to be eligible for <strong>10-point Veterans' Preference (PH)</strong> as a Purple Heart recipient.",
      documentation: "Typically, a DD-214 and official documentation verifying the Purple Heart award.",
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/",
        text: "OPM Vet Guide Chapter 2: Types of Preference"
      }
    },
    'result-10-point-cp': {
      description: "Based on your answers, you appear to be eligible for <strong>10-point Compensable Disability Preference (CP)</strong>. This preference is generally granted to veterans who have a compensable service-connected disability of 10% or more but less than 30%.",
      documentation: "Typically, a DD-214 and a letter from the Department of Veterans Affairs (VA) or a branch of the Armed Forces certifying the service-connected disability and its percentage.",
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/",
        text: "OPM Vet Guide Chapter 2: Types of Preference"
      }
    },
    'result-10-point-cps': {
      description: "Based on your answers, you appear to be eligible for <strong>10-point Compensable Disability Preference (CPS)</strong>. This preference is generally granted to veterans who have a compensable service-connected disability of 30% or more.",
      documentation: "Typically, a DD-214 and a letter from the Department of Veterans Affairs (VA) or a branch of the Armed Forces certifying the service-connected disability and its percentage.",
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/",
        text: "OPM Vet Guide Chapter 2: Types of Preference"
      }
    },
    'result-10-point-xp': {
      description: "Based on your answers, you appear to be eligible for <strong>10-point Other (XP)</strong> preference. This preference applies to certain categories of veterans, including those who are not compensably disabled but who served in a war or campaign and received a Purple Heart, or who meet other specific criteria outlined by OPM.",
      documentation: "Varies depending on the specific XP category. Typically, a DD-214 and relevant documentation from the VA or military branch.",
      reference: {
        url: "https://www.opm.gov/policy-data-oversight/veterans-services/vet-guide-for-hr-professionals/vet-guide-chapter-2/",
        text: "OPM Vet Guide Chapter 2: Types of Preference"
      }
    },
    'error': {
      description: "An unexpected error occurred or the assessment path is incomplete. Please try again.",
      documentation: null,
      reference: null
    }
  },
  documentation: {}, // Required docs per scenario
  references: {}     // OPM guide references
};
