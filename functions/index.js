const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();

exports.myFunction = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const data = await admin.firestore().collection("yourCollection").get();
      res.status(200).send(data.docs.map((doc) => doc.data()));
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});
