import readline, { type ReadLineOptions, createInterface } from 'node:readline';

export type StringLike = Promise<string> | string;

export interface InputModifier {
  (input: string): StringLike;
}

export type NestedInputModifier =
  | InputModifier[]
  | Array<InputModifier | InputModifier[]>;

export type NumberLike = Promise<number> | number;

export interface InputNumberModifier {
  (input: number): NumberLike;
}

export type NestedInputNumberModifier =
  | InputNumberModifier[]
  | Array<InputNumberModifier | InputNumberModifier[]>;

export interface AskOptions {
  useModifiers: boolean;
  hide:
    | boolean
    | {
        placeholder: string;
      };
}

export class Prompt {
  private readonly inputModifiers: InputModifier[] = [];
  private readonly readLineOptions: ReadLineOptions = {
    input: process.stdin,
    output: process.stdout,
  };

  constructor(readLineOptions: Partial<ReadLineOptions> = {}) {
    this.readLineOptions = {
      ...this.readLineOptions,
      ...readLineOptions,
    };
  }

  use(...inputModifiers: NestedInputModifier) {
    for (const inputModifier of inputModifiers) {
      if (Array.isArray(inputModifier)) {
        this.use(...inputModifier);
        continue;
      }
      this.inputModifiers.push(inputModifier);
    }
  }

  ask(question: string = '', options: Partial<AskOptions> = {}) {
    const askOptions: AskOptions = {
      useModifiers: true,
      hide: false,
      ...options,
    };
    const readLineInterface = createInterface(this.readLineOptions);
    const answer = new Promise<string>((resolve) => {
      readLineInterface.question(question, async (input) => {
        readLineInterface.close();
        if (askOptions.useModifiers) {
          for (const inputModifier of this.inputModifiers) {
            input = await Promise.resolve(inputModifier(input));
          }
        }
        resolve(input);
      });
    });

    if (askOptions.hide) {
      let placeholder = '*';
      let line = '';

      if (
        typeof askOptions.hide === 'object' &&
        typeof askOptions.hide.placeholder === 'string'
      ) {
        placeholder = askOptions.hide.placeholder;
      }

      readline.emitKeypressEvents(this.readLineOptions.input);

      if (this.readLineOptions.input === process.stdin && process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      const backspace = () => {
        line = line.slice(0, line.length - 1);
        if (line.length < 1) return;
        if (this.readLineOptions.output) {
          for (let i = 0; i < line.length; i++) {
            readline.moveCursor(this.readLineOptions.output, -1, 0);
            this.readLineOptions.output.write(placeholder);
            readline.moveCursor(this.readLineOptions.output, -1, 0);
          }
          readline.moveCursor(this.readLineOptions.output, line.length, 0);
        }
      };

      const keypress = (
        data: string,
        { ctrl, meta, name }: { [key: string]: unknown }
      ) => {
        if (typeof data === 'string' && data.length < 1) return;

        if (ctrl) {
          switch (name as string) {
            case 'c':
              readLineInterface.close();
              return;
            case 'h':
              backspace();
              return;
          }
        }

        if (!meta) {
          switch (name as string) {
            case 'return':
            case 'enter':
              readLineInterface.close();
              if (
                this.readLineOptions.input === process.stdin &&
                process.stdin.isTTY
              ) {
                process.stdin.setRawMode(false);
              }
              this.readLineOptions.input.removeListener('keypress', keypress);
              return;
            case 'backspace':
              return backspace();
            default:
              if (typeof data === 'string' && data) {
                line += data;
                if (this.readLineOptions.output) {
                  if (line) {
                    readline.moveCursor(this.readLineOptions.output, -1, 0);
                    this.readLineOptions.output.write(placeholder);
                    readline.moveCursor(this.readLineOptions.output, 0, 0);
                  }
                }
              }
          }
        }
      };

      this.readLineOptions.input.on('keypress', keypress);
    }

    return {
      asString: async (...inputModifiers: NestedInputModifier) =>
        this.stringResponse(await answer, ...inputModifiers),
      asNumber: async (...inputNumberModifiers: NestedInputNumberModifier) =>
        this.numberResponse(await answer, ...inputNumberModifiers),
    };
  }

  private async stringResponse(
    input: string,
    ...inputModifiers: NestedInputModifier
  ) {
    for (const inputModifier of inputModifiers) {
      if (Array.isArray(inputModifier)) {
        input = await Promise.resolve(
          this.stringResponse(input, ...inputModifier)
        );
        continue;
      }
      input = await Promise.resolve(inputModifier(input));
    }
    return input;
  }

  private async numberResponse(
    input: string,
    ...inputNumberModifiers: NestedInputNumberModifier
  ) {
    let result = Number(input);
    for (const inputModifier of inputNumberModifiers) {
      if (Array.isArray(inputModifier)) {
        result = await Promise.resolve(
          this.numberResponse(input, ...inputModifier)
        );
        continue;
      }
      result = await Promise.resolve(inputModifier(result));
    }
    return result;
  }
}
