import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load Service Account
// Assuming the user has a service-account.json in the root for admin tasks.
// If not, I will guide them to get one, or use a simpler method.
// Alternatively, if they are already logged in with CLI, we can use applicationDefault.

let app;
try {
  const serviceAccount = JSON.parse(readFileSync(join(process.cwd(), 'service-account.json'), 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  console.log("No service-account.json found. Trying default credentials...");
  app = initializeApp();
}

const db = getFirestore(app);

const EXAM_CATEGORY = 'GROUP-B';

const syllabus = [
  {
    part: 'Paper I',
    categories: [
      {
        name: 'Acts and Postal Guides',
        topics: [
          'Consumer Protection Act, 2019',
          'Prevention of Money Laundering Act, 2002',
          'Indian Post Office Rules, 1933',
          'Post Office Guide Part I',
          'Post Office Guide Part II',
          'Guidelines for Inland and Foreign Post services',
          'Book of BO Rules'
        ]
      },
      {
        name: 'Mail Operations & Remittances',
        topics: [
          'Postal Manual Volume V',
          'Postal Manual Volume VII',
          'PNOP / Business Development Guidelines',
          'Money Remittance - eMO, IMTS, IFS MO'
        ]
      },
      {
        name: 'Savings Schemes & Insurance',
        topics: [
          'Government Savings Promotion Rules, 2018',
          'Post Office Saving Account Scheme, 2019',
          'National Savings Schemes (RD, TD, MIS, SCSS, NSC, KVP)',
          'PPF and SSA Schemes, 2019',
          'Post Office Saving Bank Manual Vol I & II',
          'SB Orders and CBS Manual',
          'Post Office Life Insurance Rules, 2011'
        ]
      },
      {
        name: 'Organization & Administration',
        topics: [
          'Organization of the Department (PM Vol II Ch I)',
          'Citizen Charter and Grievance Handling',
          'Handbook on Philately',
          'Manual of Office Procedure',
          'Material Management (PM Vol II Ch VI, VIII, IX, XII)',
          'GFR 2017 Chapter 6 & CVC Guidelines'
        ]
      },
      {
        name: 'Establishment & Personnel',
        topics: [
          'Postal Manual Volume IV',
          'APAR and Financial Powers',
          'Welfare Measures and Reservation Policy',
          'Recruitment Rules and Establishment Norms'
        ]
      },
      {
        name: 'General Knowledge',
        topics: ['current affairs']
      }
    ]
  },
  {
    part: 'Paper II',
    categories: [
      {
        name: 'Conduct and Disciplinary Rules',
        topics: [
          'CCS (Conduct) Rules, 1964',
          'CCS (CCA) Rules, 1965',
          'CCS (Temporary Service) Rules, 1965',
          'CAT Act, 1985'
        ]
      },
      {
        name: 'Pension and Retirement Benefits',
        topics: [
          'CCS (Pension) Rules, 2021',
          'New Pension Scheme, 2004',
          'CCS (Commutation of Pension) Rules, 1981',
          'CGEGIS, 1980'
        ]
      },
      {
        name: 'Leave and Allowances',
        topics: [
          'CCS (Leave) Rules, 1972',
          'Joining Time Rules, 1979',
          'LTC Rules, 1988',
          'Medical Attendance Rules, 1944',
          'Children Education Allowance'
        ]
      },
      {
        name: 'Service and Financial Rules',
        topics: [
          'Fundamental and Supplementary Rules',
          'Revised Pay Rules, 2016',
          'Postal Financial Handbook Vol I & II',
          'GFR 2017 (General)',
          'GST Act, 2017'
        ]
      },
      {
        name: 'Miscellaneous Rules',
        topics: [
          'Gramin Dak Sevak (Conduct) Rules, 2011',
          'RTI Act 2005 and Rules 2012',
          'POSH Act, 2013',
          'Public Accountants Default and Revenue Recovery',
          'Prevention of Corruption Act, 1988',
          'IPPB and Preservation of Records'
        ]
      }
    ]
  }
];

async function seed() {
  console.log(`🚀 Starting seeding for ${EXAM_CATEGORY}...`);

  for (const item of syllabus) {
    const part = item.part;
    for (const catData of item.categories) {
      console.log(`📁 Adding Category: ${catData.name}...`);
      
      // 1. Find or create category
      const catQuery = await db.collection('categories')
        .where('name', '==', catData.name)
        .limit(1)
        .get();
      
      let categoryId;
      if (catQuery.empty) {
        const newCatRef = db.collection('categories').doc();
        categoryId = newCatRef.id;
        await newCatRef.set({
          id: categoryId,
          name: catData.name,
          examCategories: [EXAM_CATEGORY]
        });
        console.log(`✅ Created Category: ${catData.name} (${categoryId})`);
      } else {
        const existingCat = catQuery.docs[0];
        categoryId = existingCat.id;
        const currentExams = existingCat.data().examCategories || [];
        if (!currentExams.includes(EXAM_CATEGORY)) {
          await existingCat.ref.update({
            examCategories: [...currentExams, EXAM_CATEGORY]
          });
          console.log(`✅ Updated existing Category: ${catData.name} for ${EXAM_CATEGORY}`);
        }
      }

      // 2. Add Topics
      for (const topicTitle of catData.topics) {
        const topicQuery = await db.collection('topics')
          .where('title', '==', topicTitle)
          .where('categoryId', '==', categoryId)
          .where('part', '==', part)
          .limit(1)
          .get();
        
        if (topicQuery.empty) {
          const newTopicRef = db.collection('topics').doc();
          await newTopicRef.set({
            id: newTopicRef.id,
            title: topicTitle,
            description: `Syllabus topic for ${EXAM_CATEGORY} ${part}`,
            categoryId: categoryId,
            part: part,
            examCategories: [EXAM_CATEGORY],
            uploadedAt: new Date().toISOString()
          });
          console.log(`   🔸 Added Topic: ${topicTitle}`);
        } else {
          const existingTopic = topicQuery.docs[0];
          const currentExams = existingTopic.data().examCategories || [];
          if (!currentExams.includes(EXAM_CATEGORY)) {
            await existingTopic.ref.update({
              examCategories: [...currentExams, EXAM_CATEGORY]
            });
            console.log(`   🔸 Linked Topic: ${topicTitle} to ${EXAM_CATEGORY}`);
          }
        }
      }
    }
  }

  console.log(`✨ Seeding complete for ${EXAM_CATEGORY}!`);
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
