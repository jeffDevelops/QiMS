import chalk from 'chalk'

export enum Colors {
  INFO = '#39C1CE', // Rakish blue
  WARN = '#F5821E', // Rakish orange
  ERROR = '#D72638',
  SUCCESS = '#81F495',
}

/**
 *
 * @param message The message to display in the console
 * @param hexColor Optional, default INFO (Rakish blue)
 */
export const log = (message: string, hexColor: Colors = Colors.INFO) => {
  console.log(chalk.hex(hexColor)(message))
}
