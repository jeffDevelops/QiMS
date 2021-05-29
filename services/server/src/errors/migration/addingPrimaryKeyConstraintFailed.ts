export const ADDING_PRIMARY_KEY_CONSTRAINT_FAILED = (
  error: Record<string, string>,
  modelName: string,
  columnName: string,
) => `
So, here\'s the thing: qiMS tried to add a primary key constraint to table
      
\`${modelName}.${columnName}\`
      
but it couldn't, most likely because values in that column are not unique.
You can fix the duplicate values in the data and try again, select a
different column, or create a new primary key column.

Here's the actual error:
      
${error?.detail ? error.detail : JSON.stringify(error, null, 2)}
`
