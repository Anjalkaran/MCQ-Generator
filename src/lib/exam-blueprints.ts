
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
          sectionName: "Post Office Guide Part I",
          questions: 15,
          topics: ["Post Office Guide Part I"],
        },
        {
          sectionName: "Products and Services - Mails",
          questions: 2,
          topics: ["Products and Services - Mails"],
        },
        {
          sectionName: "Products and Services – Banking",
          questions: 3,
          topics: ["Products and Services – Banking & Remittance"],
        },
        {
          sectionName: "Products and services – business",
          questions: 1,
          topics: ["Products and services – business"],
        },
        {
          sectionName: "Products and services – insurance",
          questions: 2,
          topics: ["Products and services – insurance"],
        },
        {
          sectionName: "Postal Manual Volume V",
          questions: 7,
          topics: ["Postal Manual Volume V"],
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
          topics: ["Basic Arithmetics"],
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
          sectionName: "Post Office Guide Part I",
          questions: 10,
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
          ],
        },
        {
          sectionName: "Products and Services",
          questions: 20,
          topics: [
            { name: "Mails", questions: 1 },
            { name: "International items and services", questions: 1 },
            { name: "Others", questions: 1 },
            { name: "Stamps", questions: 1 },
            { name: "PLI/RPLI", questions: 2 },
            { name: "Jan Suraksha Scheme", questions: 0 }, // Assuming 0 as not specified
            { name: "SCSS, SSA, PPF, Recurring Deposit, Savings Bank Account, TD and MIS", questions: 14 }, // Assuming remaining questions
          ]
        },
        {
          sectionName: "Post Office Guide Part II",
          questions: 10,
          topics: ["Post Office Guide Part II"],
        },
        {
          sectionName: "Basic terminologies related to IT Modernization Project",
          questions: 10,
          topics: ["IT Modernization Project"],
        },
        {
          sectionName: "Postal Manuals Combined I",
          questions: 5,
          topics: [
            "Postal Manual Volume VI – Part I",
            "Postal Manual Volume VI – Part III",
            "SB Orders",
          ],
        },
        {
          sectionName: "Postal Manuals Combined II",
          questions: 5,
          topics: ["Postal Manual Volume VII", "Foreign Post Manual"],
        },
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
            "Indian Geography",
            "Civics",
            "General knowledge",
            "Indian culture & freedom struggle",
            "Ethics and morale study",
            "current affairs",
          ],
        },
        {
          sectionName: "Basic Arithmetics",
          questions: 20,
          topics: [
            "BODMAS",
            "Percentage",
            "Profit and loss",
            "Simple interest",
            "Average",
            "Time and work",
            "Time and distance",
            "Unitary method",
          ],
        },
        {
          sectionName: "Reasoning and Analytical Ability",
          questions: 20,
          topics: [
            { name: "Analytical Reasoning", questions: 10 },
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
