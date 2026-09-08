import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const INITIAL_CATEGORIES = [
  {
    id: "teaching",
    title: "1.ทักษะการสอนและการถ่ายทอดความรู้ (Teaching & Mentorship)",
    description: "เกณฑ์ประเมิน: ความสามารถในการอธิบายเคสที่ซับซ้อนให้เข้าใจง่าย, ความใจเย็นเมื่อนักเรียนทำหัตถการช้า, และการเปิดโอกาสให้ซักถามโดยไม่ทำให้รู้สึกกดดัน",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "clinical",
    title: "2.ด้านการเป็นต้นแบบความปลอดภัย (Clinical Excellence & Safety)",
    description: "เกณฑ์ประเมิน: ความเป็นมืออาชีพและความละเอียดรอบคอบในการดูแลผู้ป่วย เช่น ความพิถีพิถันในการจัดท่า (Positioning) อย่างถูกต้องเพื่อป้องกันรอยกดทับ (Pressure sore) หรือ การบาดเจ็บจากการผ่าตัด การควบคุมสัญญาณชีพ การทำงานตามมาตรฐานอย่างเคร่งครัด และการเป็นกระบอกเสียงปกป้องความปลอดภัยให้คนไข้",
    color: "from-emerald-400 to-teal-500"
  },
  {
    id: "safezone",
    title: "3.ด้านความใส่ใจและสร้างบรรยากาศ: รางวัล \"เซฟโซนของน้อง\" (The Safe Zone)",
    description: "เกณฑ์ประเมิน: การเป็นที่พึ่งทางใจ สร้างบรรยากาศในห้องผ่าตัดที่ไม่กดดัน ทำให้นักเรียนรู้สึกว่ากล้าถามในสิ่งที่สงสัย กล้ารายงานปัญหาทันทีโดยไม่ต้องกลัว และคอยสังเกตความเหนื่อยล้าหรือให้กำลังใจในวันที่เจอเคสยาก",
    color: "from-pink-400 to-rose-500"
  },
  {
    id: "idol",
    title: "4.ด้านความทุ่มเทและทัศนคติ: รางวัล \"ไอดอลแห่งความทุ่มเท\" (The Inspiring Role Model)",
    description: "เกณฑ์ประเมิน: แรงบรรดาลใจในการทำงาน การรับมือกับวิกฤตหรือความตึงเครียดด้วยสติและพลังบวก การประสานงานกับทีมศัลยแพทย์ได้อย่างราบรื่น และเป็นสตาฟที่นักเรียนมองแล้วรู้สึกมีไฟ อยากเติบโตไปเป็นวิสัญญีพยาบาลที่เก่งและทุ่มเทแบบนี้",
    color: "from-amber-400 to-orange-500"
  }
];

export async function GET() {
  try {
    const batch = writeBatch(db);
    const categoriesRef = collection(db, 'categories');

    INITIAL_CATEGORIES.forEach(category => {
      // Use category.id as the document ID
      const docRef = doc(categoriesRef, category.id);
      batch.set(docRef, category);
    });

    await batch.commit();

    return NextResponse.json({ success: true, count: INITIAL_CATEGORIES.length, message: 'Categories seeded successfully' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
