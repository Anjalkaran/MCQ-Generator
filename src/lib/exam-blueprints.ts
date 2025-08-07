
export const MTS_BLUEPRINT = {
  examName: "MTS Exam",
  totalDurationMinutes: 60,
  parts: [
    {
      partName: "Part-A",
      totalMarks: 60,
      totalQuestions: 30,
      marksPerQuestion: 2,
      sections: [
        {
          sectionName: "Post Office Guide Part I & Products/Services",
          questions: 23,
          topics: [
            { name: "Organization of the Department", questions: 2 },
            { name: "Type of Post Offices", questions: 1 },
            { name: "Business Hours", questions: 1 },
            { name: "Payment of postage, stamps and stationery", questions: 2 },
            { name: "General rules as to packing, sealing and posting, manner of affixing postage stamps", questions: 2 },
            { name: "Methods of address", questions: 2 },
            { name: "Post boxes and Post bags", questions: 1 },
            { name: "Duties of Letter Box peon", questions: 1 },
            { name: "Official postal articles", questions: 1 },
            { name: "Prohibited postal articles", questions: 2 },
            { name: "Domestic Item – Mails", questions: 1 },
            { name: "Stamps", questions: 1 },
            { name: "Jan Suraksha Scheme", questions: 1 },
            { name: "SCSS, SSA, PPF, TD and MIS, Recuring Deposit, Savings Bank Account, KVP and NSC", questions: 2 },
            { name: "Third Party Services", questions: 1 },
            { name: "PLI/RPLI", questions: 2 },
          ],
        },
        {
          sectionName: "Postal Manual Volume V",
          questions: 7,
          topics: [
            { name: "Definitions", questions: 7 },
          ],
        },
      ],
    },
    {
      partName: "Part-B",
      totalMarks: 40,
      totalQuestions: 20,
      marksPerQuestion: 2,
      sections: [
        {
          sectionName: "General Awareness/Knowledge",
          questions: 10,
          topics: [
            { name: "Indian Geography", questions: 2 },
            { name: "Indian Civics", questions: 2 },
            { name: "General knowledge", questions: 1 },
            { name: "Indian culture & freedom struggle", questions: 2 },
            { name: "Ethics and morale study", questions: 1 },
            { name: "current affairs", questions: 2 },
          ],
        },
        {
          sectionName: "Basic Arithmetics",
          questions: 10,
          topics: [
            { name: "BODMAS", questions: 2 },
            { name: "Percentage", questions: 1 },
            { name: "Profit and loss", questions: 1 },
            { name: "Simple interest", questions: 1 },
            { name: "Average", questions: 1 },
            { name: "Time and work", questions: 1 },
            { name: "Time and distance", questions: 1 },
            { name: "Unitary method", questions: 2 },
          ],
        },
      ],
    },
  ],
};


export const POSTMAN_BLUEPRINT = {
  examName: "Postman Exam",
  totalDurationMinutes: 90,
  parts: [
    {
      partName: "Part-A",
      totalMarks: 100,
      totalQuestions: 50,
      marksPerQuestion: 2,
      sections: [
        {
          sectionName: "Post Office Guide Part I",
          questions: 30,
          topics: ["Post Office Guide Part I"],
        },
        {
          sectionName: "Postal Manual Volume V",
          questions: 10,
          topics: ["Postal Manual Volume V"],
        },
        {
          sectionName: "Postal Manual Volume VI - Part III",
          questions: 5,
          topics: ["Postal Manual Volume VI - Part III(PM)"],
        },
        {
          sectionName: "PM Vol VII",
          questions: 5,
          topics: ["PM Vol VII"],
        },
      ],
    },
    {
      partName: "Part-B",
      totalMarks: 50,
      totalQuestions: 25,
      marksPerQuestion: 2,
      sections: [
        {
          sectionName: "General Awareness/Knowledge",
          questions: 10,
          topics: [
            { name: "Indian Geography", questions: 2 },
            { name: "Civics", questions: 2 },
            { name: "General knowledge", questions: 1 },
            { name: "Indian culture & freedom struggle", questions: 2 },
            { name: "Ethics and morale study", questions: 1 },
            { name: "current affairs", questions: 2 },
          ],
        },
        {
          sectionName: "Basic Arithmetics",
          questions: 10,
          topics: ["Basic Arithmetics"],
        },
        {
          sectionName: "Reasoning and Analytical Ability",
          questions: 5,
          topics: [],
        },
      ],
    },
  ],
};

export const PA_BLUEPRINT = {
  examName: "PA Exam",
  totalDurationMinutes: 120,
  parts: [
    {
      partName: "Part-A",
      totalMarks: 50,
      totalQuestions: 50,
      marksPerQuestion: 1,
      sections: [
        {
          sectionName: "Post Office Guide Part I & Products/Services",
          questions: 35,
          topics: [
            { name: "Organization of the Department", questions: 1 },
            { name: "Type of Post Offices", questions: 1 },
            { name: "Business Hours", questions: 1 },
            { name: "Payment of postage, stamps and stationery", questions: 1 },
            { name: "General rules as to packing, sealing and posting, manner of affixing postage stamps", questions: 1 },
            { name: "Methods of address", questions: 1 },
            { name: "Post boxes and Post bags", questions: 1 },
            { name: "Duties of Letter Box peon", questions: 1 },
            { name: "Official postal articles", questions: 1 },
            { name: "Prohibited postal articles", questions: 1 },
            { name: "Domestic Items – Mails", questions: 1 },
            { name: "International items and services", questions: 1 },
            { name: "Stamps", questions: 1 },
            { name: "PLI/RPLI", questions: 2 },
            { name: "Jan Suraksha Scheme", questions: 0 },
            { name: "SCSS, SSA, PPF, Recurring Deposit, Savings Bank Account, TD and MIS", questions: 20 },
          ]
        },
        {
          sectionName: "Post Office Guide Part II",
          questions: 10,
          topics: [{ name: "Post Office Guide Part II", questions: 10 }],
        },
        {
          sectionName: "IT Modernization",
          questions: 10,
          topics: [
            { name: "Basic terminologies related to IT", questions: 5 },
            { name: "IT Modernization Project", questions: 5 },
          ],
        },
        {
          sectionName: "Postal Manuals & Orders",
          questions: 10,
          topics: [
            { name: "Postal Manual Volume VI – Part I", questions: 0 },
            { name: "Postal Manual Volume VI – Part III", questions: 5 },
            { name: "SB Orders", questions: 0 },
            { name: "Postal Manual Volume VII", questions: 5 },
            { name: "Foreign Post Manual", questions: 0 },
          ]
        }
      ],
    },
    {
      partName: "Part-B",
      totalMarks: 50,
      totalQuestions: 50,
      marksPerQuestion: 1,
      sections: [
        {
          sectionName: "General Awareness/Knowledge",
          questions: 10,
          topics: [
            { name: "Indian Geography", questions: 2 },
            { name: "Civics", questions: 2 },
            { name: "General knowledge", questions: 1 },
            { name: "Indian culture & freedom struggle", questions: 2 },
            { name: "Ethics and morale study", questions: 1 },
            { name: "current affairs", questions: 2 },
          ],
        },
        {
          sectionName: "Basic Arithmetics",
          questions: 20,
          topics: [
            { name: "BODMAS", questions: 2 },
            { name: "Percentage", questions: 2 },
            { name: "Profit and loss", questions: 3 },
            { name: "Simple interest", questions: 3 },
            { name: "Average", questions: 3 },
            { name: "Time and work", questions: 2 },
            { name: "Time and distance", questions: 3 },
            { name: "Unitary method", questions: 2 },
          ],
        },
        {
          sectionName: "Reasoning and Analytical Ability",
          questions: 20,
          topics: [
            { name: "Logical Reasoning", questions: 10 },
            { name: "Cubs and dice", questions: 2 },
            { name: "Dot situation", questions: 1 },
            { name: "Embedded images", questions: 1 },
            { name: "Figure matrix", questions: 1 },
            { name: "Image Analysis", questions: 1 },
            { name: "Mirror Images", questions: 1 },
            { name: "Paper Folding", questions: 1 },
            { name: "Paper Cutting", questions: 1 },
            { name: "Pattern Completion", questions: 1 },
          ],
        },
      ],
    },
  ],
};
