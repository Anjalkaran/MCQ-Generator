
export const IP_BLUEPRINT = {
    examName: 'Inspector Posts Exam',
    totalDurationMinutes: 180, // Example, adjust as needed
    parts: [
      {
        partName: 'Paper-I',
        totalQuestions: 100, // Example total
        sections: [
          {
            sectionName: 'Post Office Guide & Manuals',
            // Add specific topics here for Paper I
            randomFrom: {
              questions: 100,
              topics: ['Topic for IP Paper 1 - A', 'Topic for IP Paper 1 - B'],
            },
          },
        ],
      },
      {
        partName: 'Paper-II',
        totalQuestions: 50, // Example total
        sections: [
          {
            sectionName: 'General Awareness & English',
             // Add specific topics here for Paper II
            randomFrom: {
              questions: 50,
              topics: ['Topic for IP Paper 2 - A', 'Topic for IP Paper 2 - B'],
            },
          },
        ],
      },
    ],
  };
