import { 
  MTS_BLUEPRINT, 
  POSTMAN_BLUEPRINT, 
  PA_BLUEPRINT, 
  GROUPB_BLUEPRINT,
  IP_BLUEPRINT 
} from './exam-blueprints';
import { UserPlanner, PlannerDay, PlannerTopic, UserData } from './types';

const BLUEPRINTS: Record<string, any> = {
  MTS: MTS_BLUEPRINT,
  POSTMAN: POSTMAN_BLUEPRINT,
  PA: PA_BLUEPRINT,
  IP: IP_BLUEPRINT,
  'GROUP B': GROUPB_BLUEPRINT
};

export const DEFAULT_DURATIONS: Record<string, { fast: number; standard: number; comprehensive: number }> = {
  MTS: { fast: 20, standard: 30, comprehensive: 45 },
  POSTMAN: { fast: 30, standard: 45, comprehensive: 60 },
  PA: { fast: 45, standard: 75, comprehensive: 90 },
  IP: { fast: 60, standard: 120, comprehensive: 180 },
  'GROUP B': { fast: 90, standard: 150, comprehensive: 180 },
};

/**
 * Generates a structured study plan based on the exam category and desired duration.
 */
export function generatePlanner(
  uid: string, 
  examCategory: UserData['examCategory'],
  planType: 'Fast Track' | 'Standard Preparation' | 'Comprehensive Mastery'
): UserPlanner {
  const blueprint = BLUEPRINTS[examCategory];
  const durations = DEFAULT_DURATIONS[examCategory];
  
  let durationDays = durations.standard;
  if (planType === 'Fast Track') durationDays = durations.fast;
  if (planType === 'Comprehensive Mastery') durationDays = durations.comprehensive;

  // 1. Extract all topics from the blueprint hierarchy
  const allTopics: { id: string; name: string }[] = [];
  blueprint.parts.forEach((part: any) => {
    part.sections.forEach((section: any) => {
      // Direct topics
      if (section.topics) {
        section.topics.forEach((topic: any) => {
          const id = topic.id || `topic-${topic.name || topic}`;
          const name = topic.name || topic;
          allTopics.push({ id, name });
        });
      }
      // Random pool topics (often found in Postman/PA blueprints)
      if (section.randomFrom?.topics) {
        section.randomFrom.topics.forEach((topic: string) => {
          allTopics.push({ id: `random-${topic.replace(/\s+/g, '-').toLowerCase()}`, name: topic });
        });
      }
    });
  });

  // 2. Distribute topics across the timeline
  // We reserve every 7th day (Sundays) for rest and revision
  const studyDaysCount = durationDays - Math.floor(durationDays / 7);
  const topicsPerDay = Math.ceil(allTopics.length / studyDaysCount);

  const days: PlannerDay[] = [];
  let topicIndex = 0;

  for (let d = 1; d <= durationDays; d++) {
    const isRestDay = d % 7 === 0;
    const dayTopics: PlannerTopic[] = [];

    if (!isRestDay) {
      // Fill the day with its share of topics
      for (let i = 0; i < topicsPerDay && topicIndex < allTopics.length; i++) {
        dayTopics.push({
          id: allTopics[topicIndex].id,
          name: allTopics[topicIndex].name,
          completed: false
        });
        topicIndex++;
      }
    }

    days.push({
      dayNumber: d,
      topics: dayTopics,
      isRestDay,
      customTasks: isRestDay 
        ? [{ id: `rev-${d}`, title: 'Weekly Revision & Mock Test', completed: false }] 
        : [{ id: `daily-test-${d}`, title: 'Attempt Daily Test', completed: false }]
    });
  }

  return {
    uid,
    examCategory,
    planType,
    durationDays,
    startDate: new Date(),
    days,
    currentDay: 1,
    isCompleted: false,
    updatedAt: new Date()
  };
}

/**
 * Calculates current progress percentage.
 */
export function calculatePlannerProgress(planner: UserPlanner): number {
  let totalTasks = 0;
  let completedTasks = 0;

  planner.days.forEach(day => {
    day.topics.forEach(t => {
      totalTasks++;
      if (t.completed) completedTasks++;
    });
    day.customTasks?.forEach(ct => {
      totalTasks++;
      if (ct.completed) completedTasks++;
    });
  });

  return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
}
