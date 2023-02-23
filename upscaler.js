const path = require("path");
const fs = require("fs");
const Upscaler = require("upscaler/node");
const tf = require("@tensorflow/tfjs-node");
const upscaler = new Upscaler();
const pathArgs = process.argv.slice(2);
const srcPath = pathArgs[0];
const dstPath = pathArgs[1];
const main = async () => {
  const files = fs.readdirSync(srcPath);
  for (let f of files) {
    try {
      if (fs.existsSync(path.join(dstPath, f))) {
        console.log("%s exists %s", dstPath, f);
        continue;
      }
    } catch (error) {
      console.log(error);
      continue;
    }
    let sf = path.join(srcPath, f);
    console.log("read %s", sf);
    if (!f.endsWith(".jpg")) continue;
    let image;
    try {
      const data = fs.readFileSync(sf);
      image = tf.node.decodeImage(data, 3);
    } catch (error) {
      console.log("decode %s %s", f, error.message);
    }
    if (!image) continue;
    await upscaler
      .upscale(image, {
        output: "tensor",
        patchSize: 512,
        padding: 5,
      })
      .then((tensor) => {
        image.dispose();
        tf.node
          .encodePng(tensor)
          .then((upscaledImage) => {
            tensor.dispose();
            let df = path.join(dstPath, f);
            console.log("write %s", df);
            fs.writeFileSync(df, upscaledImage);
          })
          .catch((error) => {
            console.log(f + " Encode=>" + error);
          });
      })
      .catch((error) => {
        console.log(f + " Upscale=>" + error);
      });
  }
};
function terminate(options = { coredump: false, timeout: 500 }) {
  // Exit function
  const exit = (code) => {
    options.coredump ? process.abort() : process.exit(code);
  };

  return (code, reason) => (err, promise) => {
    if (err && err instanceof Error) {
      // Log error information, use a proper logging library here :)
      console.log(err.message, err.stack);
    }
    setTimeout(exit, options.timeout).unref();
  };
}
const exitHandler = terminate();

process.on("uncaughtException", exitHandler(1, "Unexpected Error"));
process.on("unhandledRejection", exitHandler(1, "Unhandled Promise"));
process.on("SIGTERM", exitHandler(0, "SIGTERM"));
process.on("SIGINT", exitHandler(0, "SIGINT"));

main();
