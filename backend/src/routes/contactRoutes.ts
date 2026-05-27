import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as ContactController from "../controllers/ContactController";

const contactRoutes = express.Router();

contactRoutes.get("/contacts", isAuth, ContactController.index);

contactRoutes.get("/contacts/:contactId", isAuth, ContactController.show);

contactRoutes.post("/contacts", isAuth, isAdmin, ContactController.store);

contactRoutes.post("/contact", isAuth, ContactController.getContact);

contactRoutes.put("/contacts/:contactId", isAuth, isAdmin, ContactController.update);

contactRoutes.delete("/contacts/:contactId", isAuth, isAdmin, ContactController.remove);

export default contactRoutes;
