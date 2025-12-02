import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed micro-tasks
  const microTasks = [
    // Physical
    { title: "10 pushups", description: "Drop and give me 10", durationSec: 30, category: "physical" },
    { title: "20 jumping jacks", description: "Get your blood pumping", durationSec: 30, category: "physical" },
    { title: "Plank for 30 seconds", description: "Hold strong", durationSec: 30, category: "physical" },
    { title: "Stretch for 1 minute", description: "Touch your toes, reach for the sky", durationSec: 60, category: "physical" },
    { title: "Walk around the block", description: "Get outside, move your body", durationSec: 120, category: "physical" },

    // Social
    { title: "Text one friend", description: "Real connection, not scrolling", durationSec: 60, category: "social" },
    { title: "Call someone you love", description: "2-minute check-in call", durationSec: 120, category: "social" },
    { title: "Compliment someone", description: "Make someone's day", durationSec: 30, category: "social" },

    // Productive
    { title: "Review one job posting", description: "Just one. Read it carefully.", durationSec: 120, category: "productive" },
    { title: "Update one line of your resume", description: "One small improvement", durationSec: 90, category: "productive" },
    { title: "Organize your desk", description: "Clear one surface", durationSec: 120, category: "productive" },
    { title: "Delete 10 old emails", description: "Inbox cleanup", durationSec: 60, category: "productive" },
    { title: "Plan tomorrow's top 3 tasks", description: "What matters most?", durationSec: 90, category: "productive" },

    // Mindful
    { title: "Take 5 deep breaths", description: "In for 4, out for 6", durationSec: 30, category: "mindful" },
    { title: "Journal one sentence", description: "How do you feel right now?", durationSec: 60, category: "mindful" },
    { title: "Gratitude: name 3 things", description: "What are you grateful for?", durationSec: 60, category: "mindful" },
    { title: "Drink a full glass of water", description: "Hydrate yourself", durationSec: 30, category: "mindful" },
    { title: "2-minute meditation", description: "Just breathe and be present", durationSec: 120, category: "mindful" },
  ]

  for (const task of microTasks) {
    await prisma.microTask.create({
      data: task,
    })
  }

  console.log(`Seeded ${microTasks.length} micro-tasks`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
