
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
          questionCount: 23,
          topics: [
            "Organization of the Department",
            "Type of Post Offices",
            "Business Hours",
            "Payment of postage, stamps and stationery",
            "General rules as to packing, sealing and posting, manner of affixing postage stamps",
            "Methods of address",
            "Post boxes and Post bags",
            "Duties of Letter Box peon",
            "Official postal articles",
            "Prohibited postal articles",
            "Products and Services: Mails, Banking & Remittances, Insurance, Stamps and Business (Reference: India Post website)",
          ],
        },
        {
          sectionName: "Postal Manual Volume V",
          questionCount: 7,
          topics: ["Definitions"],
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
          questionCount: 10,
          notes: "1 to 3 questions from each topic",
          topics: [
            "Indian Geography",
            "Indian Civics",
            "General knowledge",
            "Indian culture & freedom struggle",
            "Ethics and morale study",
            "Current Affairs",
          ],
        },
        {
          sectionName: "Basic Arithmetic",
          questionCount: 10,
          notes: "1 to 2 questions from each topic",
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
      ],
    },
  ],
};
