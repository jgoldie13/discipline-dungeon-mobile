const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$queryRaw`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'PhoneDailyLog' 
    ORDER BY indexname;
  `
  console.log('Current indexes on PhoneDailyLog:')
  console.log(JSON.stringify(result, null, 2))
  
  const hasWrongIndex = result.some(r => r.indexname === 'PhoneDailyLog_date_key')
  
  if (hasWrongIndex) {
    console.error('\n❌ ERROR: PhoneDailyLog_date_key still exists!')
    process.exit(1)
  } else {
    console.log('\n✅ SUCCESS: PhoneDailyLog_date_key has been removed')
  }
}

main().finally(() => prisma.$disconnect())
