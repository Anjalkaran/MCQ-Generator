
import { initializeFirebaseAdmin } from '../lib/firebase-admin';
import { IP_BLUEPRINT } from '../lib/exam-blueprints-ip';

async function seed() {
  console.log('--- Starting IP Syllabus Seeding ---');
  
  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    
    // Ensure we are connected to the correct project
    console.log(`Connected to project: ${admin.app().options.projectId || 'Default Project'}`);
    
    const docRef = db.collection('syllabi').doc('IP');
    
    console.log('Writing to Firestore: syllabi/IP...');
    
    await docRef.set({
      ...IP_BLUEPRINT,
      id: 'IP',
      updatedAt: new Date().toISOString(),
      lastModified: new Date()
    });
    
    console.log('✅ IP Syllabus Seeded Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding IP Syllabus:', error);
    process.exit(1);
  }
}

seed();
