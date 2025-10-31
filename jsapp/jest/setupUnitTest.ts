// Polyfill global fetch (for Node 20 and older)
import 'whatwg-fetch'

import chai from 'chai'
import $ from 'jquery'
import { TextDecoder, TextEncoder } from 'util'

// Add global t() mock (see /static/js/global_t.js)
global.t = (str: string) => str

// @ts-expect-error: ℹ️ Add chai global for BDD-style tests
global.chai = chai

// @ts-expect-error: ℹ️ Use chai's version of `expect`
global.expect = chai.expect

// @ts-expect-error: ℹ️ Add jQuery globals for xlform code
global.jQuery = global.$ = $

// Polyfill TextEncoder/TextDecoder used by libraries in the tests
// @ts-expect-error assigning to global
global.TextEncoder = TextEncoder
// @ts-expect-error assigning to global
global.TextDecoder = TextDecoder
