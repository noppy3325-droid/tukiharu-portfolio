// Run only with read access to the previous database. Credentials are read from
// DATABASE_URL, never included in the export or command-line arguments.
import mysql from "mysql2/promise";
import { defaultProfile } from "../shared/profile.ts";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in the process environment");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const query = async sql => (await connection.query(sql))[0];
  const [settings, works, books, gallery, posts, comments, likes] =
    await Promise.all([
      query("SELECT * FROM siteSettings WHERE id=1"),
      query("SELECT * FROM works"),
      query("SELECT * FROM books"),
      query("SELECT * FROM galleryItems"),
      query("SELECT * FROM blogPosts"),
      query(
        "SELECT c.id,c.postId,c.authorId,c.body,c.createdAt,c.editedAt,c.deletedAt,u.name AS authorName FROM blogComments c JOIN users u ON c.authorId=u.id"
      ),
      query("SELECT postId,visitorKey FROM blogLikes"),
    ]);
  const profile = {
    ...defaultProfile,
    ...(settings[0]?.profileJson ? JSON.parse(settings[0].profileJson) : {}),
    introduction: settings[0]?.introduction || defaultProfile.introduction,
  };
  process.stdout.write(
    JSON.stringify(
      { version: 1, profile, works, books, gallery, posts, comments, likes },
      null,
      2
    ) + "\n"
  );
} finally {
  await connection.end();
}
