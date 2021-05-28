export const NO_DB_HOST = `-----------------------------------------------------------------------------
🚨 No DATABASE_HOST specified in environment variables. Please
add the hostname to the DATABASE_HOST key in /.env.

If you have your database connection string, the value
you need is whatever appears in the URL for "host" after the
'@' in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality
-----------------------------------------------------------------------------\n`
