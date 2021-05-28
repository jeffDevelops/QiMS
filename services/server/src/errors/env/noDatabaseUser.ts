export const NO_DB_USER = `-----------------------------------------------------------------------------
🚨 Environment variable DATABASE_USER missing at runtime.
Please add the username to the DATABASE_USER key in
/.env. If you're running Postgres locally,
this is often the name of your system's user, which will
often appear on the command prompt in your Terminal.

Or, if you have your database connection string, the value
you need is whatever appears in the URL for "user" before the
second colon in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality
-----------------------------------------------------------------------------\n`
