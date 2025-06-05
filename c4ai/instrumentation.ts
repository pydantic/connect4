// This has to be a separate file imported from the node script, so that the instrumentation
// can properly patch the various modules before they are loaded by the application.
import * as logfire from 'logfire'

logfire.configure({
  diagLogLevel: logfire.DiagLogLevel.DEBUG,
})
