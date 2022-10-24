const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.byToken = async (token) => {
  try {
    const payLoad = jwt.verify(token, process.env.JWT);

    const user = await User.findByPk(payLoad.id);

    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.beforeCreate(async (credential) => {
  credential.password = await bcrypt.hash(credential.password, 10);
});

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user) {
    if (bcrypt.compare(password, user.password)) {
      return jwt.sign(
        {
          id: user.id,
        },
        process.env.JWT
      );
    }
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.getNotes = async (id) => {
  const result = await User.findOne({
    where: {
      id: id,
    },
    include: {
      model: Note,
    },
  });
  if (id) {
    return result.notes;
  }
};

User.hasMany(Note);
Note.belongsTo(User);

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const notes = [
    { text: "one", userId: 1 },
    { text: "two", userId: 2 },
    { text: "three", userId: 3 },
  ];
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  await Promise.all(notes.map((note) => Note.create(note)));
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
