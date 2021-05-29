import { log, Colors } from '../server/src/utils/log'

log(`
                                ::::.        .:::::           ..:::..      
                     ::           :: :.     .. ::          .::       ::.   
     ..:::..::                    ::  .::  .   ::           .::             
  .:       ::       .::           ::   .::.    ::               :        
 .::       ::        ::           ::    .:     ::                 ::.     
   ::.  ..:::        ::           ::           ::         .::      .::
           ::       .::.        ..::.         .::..         ..:::..  
           ::
          .::.

----------------------------------------------------------------------------
Qi /ˈtʃiː/ CHEE (noun, Chinese): vital energy channelled to animate the body
----------------------------------------------------------------------------
qiMS takes a slightly different approach than you might be used to when it
comes to application development: 

The database schema is the single source of truth for the way your data is
represented.

When you give qiMS access to a Postgres database, it creates a GraphQL API
you can consume to create, read, update, and delete records in that database!
It also gives you an admin user interface to define new entities and
relationships.
`)

log(
  `----------------------------------------------------------------------------
If any additional applications consume this data, you will likely be breaking
those applications! 

BY CONTINUING, I UNDERSTAND THAT QIMS MIGRATES EXISTING DATA, MUTATING THE
DATABASE SCHEMA AND POTENTIALLY BREAKING OTHER APPLICATIONS THAT CONSUME THE
CONNECTED DATABASE.

If you'd like to try qiMS with an existing dataset, we'd recommend either

1) Schema Readonly Mode, which disables the ability to migrate the database, or
2) making a copy of the existing database by restoring an empty database with a
dump from the one you'd like to experiment with.
--------------------------------------------------------------------------`,
  Colors.WARN,
)

log(`
About this CLI

qiMS requires multiple processes to run and will automatically start a terminal
multiplexor. For best results, make this terminal full-screen. To quit, click
into each child process and Ctrl + c at any time, just like you would with any
other terminal window.

On startup, the CLI process is interactive and will require your input.
`)
