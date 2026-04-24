
import { initializeFirebaseAdmin } from '../lib/firebase-admin';
import { PA_BLUEPRINT } from '../lib/exam-blueprints';

async function seedPA() {
  console.log('--- Seeding PA Syllabus ---');
  
  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    
    console.log(`Connected to project: ${admin.app().options.projectId || 'Default Project'}`);
    
    const docRef = db.collection('syllabi').doc('PA');
    console.log('Writing to Firestore: syllabi/PA...');
    
    await docRef.set({
      ...PA_BLUEPRINT,
      id: 'PA',
      updatedAt: new Date().toISOString(),
      lastModified: new Date()
    });
    
    console.log('✅ PA Syllabus seeded successfully!');
    console.log('Products and Services topic with subTopics is now available for PA.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding PA Syllabus:', error);
    process.exit(1);
  }
}

seedPA();
