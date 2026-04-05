
import { initializeFirebaseAdmin } from '../lib/firebase-admin';
import { 
  MTS_BLUEPRINT, 
  POSTMAN_BLUEPRINT, 
  PA_BLUEPRINT, 
  GROUPB_BLUEPRINT,
  IP_BLUEPRINT 
} from '../lib/exam-blueprints';

async function seed() {
  console.log('--- Starting Global Syllabus Seeding ---');
  
  try {
    const admin = initializeFirebaseAdmin();
    const db = admin.firestore();
    
    // Ensure we are connected to the correct project
    console.log(`Connected to project: ${admin.app().options.projectId || 'Default Project'}`);
    
    const blueprints = [
      { id: 'MTS', data: MTS_BLUEPRINT },
      { id: 'POSTMAN', data: POSTMAN_BLUEPRINT },
      { id: 'PA', data: PA_BLUEPRINT },
      { id: 'GROUPB', data: GROUPB_BLUEPRINT },
      { id: 'IP', data: IP_BLUEPRINT }
    ];

    for (const blueprint of blueprints) {
      const docRef = db.collection('syllabi').doc(blueprint.id);
      console.log(`Writing to Firestore: syllabi/${blueprint.id}...`);
      
      await docRef.set({
        ...blueprint.data,
        id: blueprint.id,
        updatedAt: new Date().toISOString(),
        lastModified: new Date()
      });
    }
    
    console.log('✅ All Syllabi Seeded Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Syllabi:', error);
    process.exit(1);
  }
}

seed();
