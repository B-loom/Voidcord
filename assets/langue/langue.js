/* Copyright Elysia © 2025. All rights reserved */

for (const langue of ["fr", "en"]) {
    document.getElementById(langue).addEventListener("click", () => {
        window.langueAPI.choisir(langue);
    });
}
