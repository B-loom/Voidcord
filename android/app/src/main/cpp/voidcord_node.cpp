/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le lanceur de Node.js.
 *
 * `libnode.so` expose `node::Start(argc, argv)`, exactement comme l'exécutable `node`.
 * Tout ce fichier fait, c'est l'appeler depuis le fil que Kotlin lui réserve, avec le
 * chemin du serveur, et détourner la sortie standard vers logcat pour que le journal du
 * serveur soit lisible par `adb logcat -s Voidcord`.
 */

#include <jni.h>
#include <node.h>

#include <android/log.h>
#include <cstdio>
#include <cstdlib>
#include <pthread.h>
#include <string>
#include <sys/select.h>
#include <unistd.h>
#include <vector>

#define ETIQUETTE "Voidcord"

namespace {

int tuyauSortie[2];
int tuyauErreur[2];
pthread_t filJournal;

/*
 * Node écrit sur les descripteurs 1 et 2. Sur Android personne ne les lit : ils sont
 * remplacés par un tuyau, qu'un fil recopie ligne par ligne dans logcat.
 */
void *recopierVersLogcat (void *) {
    char tampon[4096];
    std::string ligne;
    while (true) {
        fd_set lecture;
        FD_ZERO(&lecture);
        FD_SET(tuyauSortie[0], &lecture);
        FD_SET(tuyauErreur[0], &lecture);
        const int plusGrand = (tuyauSortie[0] > tuyauErreur[0] ? tuyauSortie[0] : tuyauErreur[0]) + 1;
        if (select(plusGrand, &lecture, nullptr, nullptr, nullptr) <= 0) break;
        for (int i = 0; i < 2; ++i) {
            const int descripteur = i == 0 ? tuyauSortie[0] : tuyauErreur[0];
            if (!FD_ISSET(descripteur, &lecture)) continue;
            const ssize_t lus = read(descripteur, tampon, sizeof(tampon) - 1);
            if (lus <= 0) continue;
            tampon[lus] = '\0';
            ligne.append(tampon);
            size_t coupure;
            while ((coupure = ligne.find('\n')) != std::string::npos) {
                const std::string seule = ligne.substr(0, coupure);
                ligne.erase(0, coupure + 1);
                if (!seule.empty()) {
                    /*
                     * logcat coupe au-delà de quatre mille caractères, et une trace de
                     * V8 est plus longue que cela : le message utile se perdait au
                     * milieu. Les lignes trop longues partent donc par morceaux.
                     */
                    const int niveau = i == 0 ? ANDROID_LOG_INFO : ANDROID_LOG_ERROR;
                    constexpr size_t MORCEAU = 3000;
                    for (size_t debut = 0; debut < seule.size(); debut += MORCEAU) {
                        __android_log_print(niveau, ETIQUETTE, "%s", seule.substr(debut, MORCEAU).c_str());
                    }
                }
            }
        }
    }
    return nullptr;
}

void detournerLaSortie () {
    static bool fait = false;
    if (fait) return;
    fait = true;
    setvbuf(stdout, nullptr, _IOLBF, 0);
    setvbuf(stderr, nullptr, _IONBF, 0);
    if (pipe(tuyauSortie) != 0 || pipe(tuyauErreur) != 0) return;
    dup2(tuyauSortie[1], STDOUT_FILENO);
    dup2(tuyauErreur[1], STDERR_FILENO);
    pthread_create(&filJournal, nullptr, recopierVersLogcat, nullptr);
    pthread_detach(filJournal);
}

} // namespace

/*
 * Les chemins et la version voyagent par l'environnement, comme sur l'ordinateur : le
 * calque Electron les lit dans `process.env`. `setenv` agit sur le processus courant, et
 * Node tourne dans ce même processus.
 */
extern "C" JNIEXPORT void JNICALL
Java_com_voidcord_mobile_NodeRuntime_definirVariable (JNIEnv *env, jclass, jstring cle, jstring valeur) {
    const char *c = env->GetStringUTFChars(cle, nullptr);
    const char *v = env->GetStringUTFChars(valeur, nullptr);
    setenv(c, v, 1);
    env->ReleaseStringUTFChars(cle, c);
    env->ReleaseStringUTFChars(valeur, v);
}

extern "C" JNIEXPORT jint JNICALL
Java_com_voidcord_mobile_NodeRuntime_demarrerNode (JNIEnv *env, jclass, jobjectArray arguments) {
    detournerLaSortie();

    const jsize nombre = env->GetArrayLength(arguments);
    std::vector<std::string> copies;
    copies.reserve(static_cast<size_t>(nombre));
    for (jsize i = 0; i < nombre; ++i) {
        auto texte = reinterpret_cast<jstring>(env->GetObjectArrayElement(arguments, i));
        const char *brut = env->GetStringUTFChars(texte, nullptr);
        copies.emplace_back(brut);
        env->ReleaseStringUTFChars(texte, brut);
        env->DeleteLocalRef(texte);
    }

    /*
     * `node::Start` attend un tableau modifiable, terminé par un pointeur nul : il écrit
     * dedans pour fabriquer `process.argv`.
     */
    std::vector<char *> argv;
    argv.reserve(copies.size() + 1);
    for (auto &copie : copies) argv.push_back(const_cast<char *>(copie.c_str()));
    argv.push_back(nullptr);

    __android_log_print(ANDROID_LOG_INFO, ETIQUETTE, "Node démarre (%d arguments)", static_cast<int>(copies.size()));
    const int code = node::Start(static_cast<int>(copies.size()), argv.data());
    __android_log_print(ANDROID_LOG_INFO, ETIQUETTE, "Node s'est arrêté (code %d)", code);
    return code;
}
