import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Mapping from file names to nice department names
const departmentMap: Record<string, string> = {
  'traumatic.txt': 'Traumatic',
  'ent.txt': 'ENT',
  'ortho.txt': 'Orthopedic',
  'recovery.txt': 'Recovery room',
  'surgery1.txt': 'Surgery 1',
  'surgery2.txt': 'Surgery 2',
  'surgery3.txt': 'Surgery 3',
};

const gradients = [
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-500',
  'from-purple-400 to-violet-500',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-400 to-purple-500',
];

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ error: 'Data directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt'));
    const candidates = [];
    let idCounter = 1;

    for (const file of files) {
      const depName = departmentMap[file] || file.replace('.txt', '');
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        const fullName = line.trim();
        // Simple nickname extraction: First word after title (assumes space-separated)
        const parts = fullName.split(' ');
        // Usually parts[0] is title, parts[1] is firstname, parts[2] is lastname
        const nickname = parts.length > 1 ? parts[1] : fullName;
        
        const avatarGradient = gradients[Math.floor(Math.random() * gradients.length)];
        
        candidates.push({
          id: `staff-${idCounter.toString().padStart(3, '0')}`,
          nickname,
          fullName,
          department: depName,
          avatarGradient
        });
        idCounter++;
      }
    }

    // Write to Firestore in batches
    const batch = writeBatch(db);
    const candidatesRef = collection(db, 'candidates');

    candidates.forEach(candidate => {
      const docRef = doc(candidatesRef, candidate.id);
      batch.set(docRef, candidate);
    });

    await batch.commit();

    return NextResponse.json({ success: true, count: candidates.length, message: 'Database seeded successfully' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
