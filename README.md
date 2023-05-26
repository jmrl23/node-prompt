# Node-Prompt

Make console prompt

## Usage

```typescript
import { Prompt } from './main';

async function main() {
  const prompt = new Prompt(/** Partial<ReadLineOptions>? */);

  prompt.use((input) => input.toLowerCase() /**, ...modifiers */);

  const username = await prompt.ask('username: ').asString(
    (input) => {
      if (!input.startsWith('@')) input = `@${input}`;
      return input;
    } /**, ...modifiers */
  );

  const password = await prompt
    .ask('password: ', {
      useModifiers: false,
      hide: {
        placeholder: '*',
      },
    })
    .asString();

  console.log({ username, password });
}

void main();
```
