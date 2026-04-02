'use server';

import { getFirebaseDb } from '@/lib/firebase-admin';
import type { MCQ, MCQReport } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Updates a reported MCQ in its source collection (topicMCQs) using Admin SDK.
 */
export async function updateReportedMCQAction(
  reportId: string,
  topicId: string,
  questionId: string,
  updatedMCQ: MCQ
) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase Admin DB not available");

  try {
    if (topicId === 'reasoningBank') {
      const reasoningRef = db.collection('reasoningBank').doc(questionId);
      const reasoningDoc = await reasoningRef.get();
      if (!reasoningDoc.exists) {
        throw new Error(`Reasoning question not found for ID: ${questionId}`);
      }

      await reasoningRef.update({
        questionText: updatedMCQ.question,
        options: updatedMCQ.options,
        correctAnswer: updatedMCQ.correctAnswer,
        solutionText: updatedMCQ.solution || "",
        uploadedAt: new Date()
      });
      
    } else {
      // Find the topicMCQ document containing this MCQ
      const topicMCQsRef = db.collection('topicMCQs');
      const snapshot = await topicMCQsRef.where('topicId', '==', topicId).get();

      if (snapshot.empty) {
        throw new Error(`TopicMCQ document not found for topicId: ${topicId}`);
      }

      let updatedCount = 0;

      // Iterate through candidate documents (usually just one)
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let content;
        try {
          content = JSON.parse(data.content);
        } catch (e) {
          console.error("Failed to parse topicMCQ content JSON:", e);
          continue;
        }

        if (!content.mcqs || !Array.isArray(content.mcqs)) continue;

        const mcqIndex = content.mcqs.findIndex((m: MCQ) => {
          if (questionId && m.questionId === questionId) return true;
          // Fallback: match by question text if ID is missing or not found
          return m.question.trim() === updatedMCQ.question.trim() || 
                 m.question.trim() === updatedMCQ.question.trim().replace(/['"“”‘’]/g, ''); // Basic handle for quotes
        });

        if (mcqIndex !== -1) {
          // Found it! Update the MCQ
          const originalMCQ = content.mcqs[mcqIndex];
          content.mcqs[mcqIndex] = {
            ...originalMCQ,
            ...updatedMCQ,
            questionId, 
            topicId
          };

          // Write back the updated JSON string
          await doc.ref.update({
            content: JSON.stringify(content),
            uploadedAt: new Date()
          });
          
          updatedCount++;
          break; 
        }
      }

      if (updatedCount === 0) {
        throw new Error(`Could not find this question in topic ${topicId}. Content mapping failed.`);
      }
    }

    // common resolve logic
    const reportRef = db.collection('mcq_reports').doc(reportId);
    await reportRef.update({
      status: 'resolved',
      resolvedAt: new Date(),
      // Also update the question stored in the report to show the correction
      question: {
        ...updatedMCQ,
        questionId,
        topicId
      }
    });

    revalidatePath('/dashboard/admin/reports');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating reported MCQ:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates the status of a report (e.g. to 'in_review').
 */
export async function updateReportStatusAction(reportId: string, status: MCQReport['status']) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase Admin DB not available");

  try {
    const reportRef = db.collection('mcq_reports').doc(reportId);
    await reportRef.update({
      status,
      updatedAt: new Date()
    });
    
    revalidatePath('/dashboard/admin/reports');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
