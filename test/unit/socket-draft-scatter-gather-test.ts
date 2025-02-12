import * as zmq from "../../src"
import * as draft from "../../src/draft"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

if (zmq.capability.draft) {
  for (const proto of testProtos("tcp", "ipc", "inproc")) {
    describe(`socket with ${proto} scatter/gather`, function() {
      let scatter: draft.Scatter
      let gather: draft.Gather

      beforeEach(function() {
        scatter = new draft.Scatter()
        gather = new draft.Gather()
      })

      afterEach(function() {
        scatter.close()
        gather.close()
        global.gc?.()
      })

      describe("send/receive", function() {
        it("should deliver messages", async function() {
          /* SCATTER -> foo ->  GATHER
                     -> bar ->
                     -> baz ->
                     -> qux ->
          */

          const address = uniqAddress(proto)
          const messages = ["foo", "bar", "baz", "qux"]
          const received: string[] = []

          await gather.bind(address)
          await scatter.connect(address)

          for (const msg of messages) {
            await scatter.send(msg)
          }

          for await (const [msg] of gather) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length === messages.length) break
          }

          assert.deepEqual(received, messages)
        })

        if (proto !== "inproc") {
          it("should deliver messages with immediate", async function() {
            const address = uniqAddress(proto)
            const messages = ["foo", "bar", "baz", "qux"]
            const received: string[] = []

            await gather.bind(address)

            scatter.immediate = true
            await scatter.connect(address)

            /* Never connected, without immediate: true it would cause lost msgs. */
            await scatter.connect(uniqAddress(proto))

            for (const msg of messages) {
              await scatter.send(msg)
            }

            for await (const [msg] of gather) {
              assert.instanceOf(msg, Buffer)
              received.push(msg.toString())
              if (received.length === messages.length) break
            }

            assert.deepEqual(received, messages)
          })
        }
      })
    })
  }
} else {
  if (process.env.ZMQ_DRAFT === "true") {
    throw new Error("Draft API requested but not available at runtime.")
  }
}
