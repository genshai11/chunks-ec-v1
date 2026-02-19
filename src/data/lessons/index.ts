// Lesson data loader - imports all 15 EREL lessons from JSON files
import D1 from './D1_L0_Food_tour.json';
import D2 from './D2_L1_Wandering_souls.json';
import D3 from './D3_L2_Tell_me_about_your_se.json';
import D4 from './D4_Freetalk_1.json';
import D5 from './D5_L3_Rendezvous.json';
import D6 from './D6_L4_Excel.json';
import D7 from './D7_Freetalk_2.json';
import D8 from './D8_L5_Ecommerce.json';
import D9 from './D9_L6_Smarketing.json';
import D10 from './D10_Freetalk_3.json';
import D11 from './D11_L7_Chart.json';
import D12 from './D12_L8_Viettel.json';
import D13 from './D13_Freetalk_4.json';
import D14 from './D14_L9_Electronic_Mail.json';
import D15 from './D15_L10_Food_Porn.json';

export interface LessonItem {
  English: string;
  Vietnamese: string;
}

export interface LessonData {
  lesson_name: string;
  categories: Record<string, LessonItem[]>;
}

// All lessons in order
export const EREL_LESSONS_DATA: LessonData[] = [
  D1 as LessonData,
  D2 as LessonData,
  D3 as LessonData,
  D4 as LessonData,
  D5 as LessonData,
  D6 as LessonData,
  D7 as LessonData,
  D8 as LessonData,
  D9 as LessonData,
  D10 as LessonData,
  D11 as LessonData,
  D12 as LessonData,
  D13 as LessonData,
  D14 as LessonData,
  D15 as LessonData,
];

// Export individual lessons for direct access
export {
  D1, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D13, D14, D15
};
