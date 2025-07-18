
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
            { name: "Official postal articles", questions: 2 },
            { name: "Prohibited postal articles", questions: 2 },
            { name: "Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business (Reference: India Post website)", questions: 7 },
          ],
        },
        {
          sectionName: "Postal Manual Volume V",
          questions: 7,
          topics: [
            { name: "Definitions", questions: 7 }
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
            { name: "Current Affairs", questions: 2 },
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
          topics: [
            { name: "Organization of the Department" },
            { name: "Type of Post Offices" },
            { name: "Business Hours" },
            { name: "Payment of postage, stamps and stationery" },
            { name: "General rules as to packing, sealing and posting, manner of affixing postage stamps" },
            { name: "Methods of address" },
            { name: "Post boxes and Post bags" },
            { name: "Delivery of mails" },
            { name: "Refusal of article" },
            { name: "Payment of eMoney Order" },
            { name: "Redirection" },
            { name: "Instruction regarding address change" },
            { name: "Articles addressed to deceased person" },
            { name: "Liability to detention to certain mails" },
            { name: "Facilities provided by Postmen in rural areas" },
            { name: "Products and Services (Mails, Banking, Insurance, etc.)" },
            { name: "Prohibited postal Articles" },
          ],
        },
        {
          sectionName: "Postal Manual Volume V",
          questions: 10,
          topics: [
            { name: "Definitions" },
          ],
        },
        {
          sectionName: "Postal Manual Volume VI - Part III",
          questions: 5,
          topics: [
            { name: "Head Postman duties" },
            { name: "Knowledge of Postal Business" },
            { name: "Supply and sale of stamps & forms" },
            { name: "Postman's Book and address noting" },
            { name: "Handling damaged articles" },
            { name: "Receipts for delivery" },
            { name: "Instructions for special delivery (illiterate, Pardanashin, minors, lunatics)" },
            { name: "e-Money Order payments" },
            { name: "Duties of Village Postman" },
          ],
        },
        {
          sectionName: "Postal Manual Vol. VII",
          questions: 5,
          topics: [
            { name: "Stamps and Seals" },
            { name: "Portfolio and Stationery" },
            { name: "Daily Reports and Mail Abstracts" },
            { name: "Exchange and Disposal of Mails" },
            { name: "Transit Bags and Cage TB" },
            { name: "Duties of Mail Guard/Agent" },
            { name: "A & B Orders" },
          ],
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
            { name: "Indian Geography" },
            { name: "Indian Civics" },
            { name: "General knowledge" },
            { name: "Indian culture & freedom struggle" },
            { name: "Ethics and morale study" },
            { name: "Current affairs" },
          ],
        },
        {
          sectionName: "Basic Arithmetics",
          questions: 10,
          topics: [
            { name: "BODMAS" },
            { name: "Percentage" },
            { name: "Profit and loss" },
            { name: "Simple interest" },
            { name: "Average" },
            { name: "Time and work" },
            { name: "Time and distance" },
            { name: "Unitary method" },
          ],
        },
        {
          sectionName: "Reasoning and Analytical Ability",
          questions: 5,
          topics: [
            { name: "Non-verbal Reasoning" },
            { name: "Pictorial Reasoning" },
            { name: "Analytical Ability" },
        ],
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
      totalMarks: 100,
      totalQuestions: 50,
      marksPerQuestion: 2,
      sections: [
        {
          sectionName: "Post Office Guide Part I",
          questions: 10,
          topics: [{ name: "Post Office Guide Part I (except Telegraphic Money Order)" }],
        },
        {
          sectionName: "Post Office Guide Part II",
          questions: 10,
          topics: [{ name: "Post Office Guide Part II (except British and Irish Postal order)" }],
        },
        {
          sectionName: "IT Modernisation",
          questions: 10,
          topics: [{ name: "Basic terminologies related to IT Modernisation project of Department of Posts" }],
        },
        {
          sectionName: "Products and Services",
          questions: 10,
          topics: [{ name: "Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business" }],
        },
        {
          sectionName: "Postal Manuals and SB Orders",
          questions: 5,
          topics: [
            { name: "Postal Manual Volume VI – Part I" },
            { name: "Postal Manual Volume VI – Part III (chapter I and II)" },
            { name: "Updated SB Orders" },
          ],
        },
        {
          sectionName: "Postal and Foreign Manuals",
          questions: 5,
          topics: [
            { name: "Postal Manual Volume VII" },
            { name: "Foreign Post Manual" },
          ],
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
            { name: "Indian Geography" },
            { name: "Civics" },
            { name: "General knowledge" },
            { name: "Indian culture & freedom struggle" },
            { name: "Ethics and morale study" },
            { name: "Current affairs" },
          ],
        },
        {
          sectionName: "Basic Arithmetics",
          questions: 10,
          topics: [
            { name: "BODMAS" },
            { name: "Percentage" },
            { name: "Profit and loss" },
            { name: "Simple interest" },
            { name: "Average" },
            { name: "Time and work" },
            { name: "Time and distance" },
            { name: "Unitary method" },
          ],
        },
        {
          sectionName: "Reasoning and Analytical Ability",
          questions: 5,
          topics: [{ name: "Reasoning and Analytical Ability (Non Verbal / Pictorial)" }],
        },
      ],
    },
  ],
};
