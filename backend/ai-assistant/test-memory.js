const db = require('./db');
async function test() {
  await db.init();
  const memory = await db.crud.listMemory('fact');
  console.log("Memory:", JSON.stringify(memory, null, 2));

  // let's clear the corrupted fact
  for(const item of memory) {
    if(item.value && (item.value.includes('45') || item.value.includes('Phase 1'))) {
       console.log("Deleting:", item.key);
       await db.db.run('DELETE FROM user_data WHERE type=? AND key=?', ['fact', item.key]);
    }
  }
}
test();
