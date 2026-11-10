import process from 'node:process';
export default async function* report(events) {
  for await (const event of events) {
    if (event.type === 'test:stdout') yield event.data.message;
    if (event.type === 'test:stderr') process.stderr.write(event.data.message);
    if (event.type === 'test:pass') yield 'PASS approved greeting contract\n';
    if (event.type === 'test:fail') yield 'FAIL approved greeting contract\n';
  }
}
