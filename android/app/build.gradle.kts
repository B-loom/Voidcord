import java.io.File

plugins {
    alias(libs.plugins.android.application)
}

/*
 * L'APK a sa propre version, écrite dans `android/version.txt`.
 *
 * Elle ne suit plus celle de `package.json`. Le portage Android vit dans son dépôt —
 * B-loom/Voidcord-Apk — avec son changelog et ses publications : lui faire afficher le
 * numéro de l'application de bureau mentait sur ce qui tourne, et sur ce que la recherche
 * de mise à jour compare. `1.0.0` donne le code de version 10000, qui croît toujours ;
 * Android refuse d'installer par-dessus un code plus grand, donc une version de test déjà
 * posée avec un numéro plus élevé doit être désinstallée d'abord.
 */
val versionVoidcord: String = File(rootDir, "version.txt").readText().trim().ifEmpty { "0.0.0" }

val codeVersion: Int = versionVoidcord.split(".").let { parties ->
    val n = { i: Int -> parties.getOrNull(i)?.toIntOrNull() ?: 0 }
    n(0) * 10000 + n(1) * 100 + n(2)
}

/*
 * Node.js pour Android ne vient pas de Maven : `node scripts/fetchNodeMobile.mjs` le
 * dépose dans `android/nodejs-mobile/`. Sans lui, rien ne peut être compilé, et le dire
 * tout de suite vaut mieux qu'une erreur de l'éditeur de liens.
 */
val nodeMobile = File(rootDir, "nodejs-mobile")
val architectures: List<String> = (providers.gradleProperty("voidcord.abi").orNull ?: "arm64-v8a")
    .split(",").map { it.trim() }.filter { it.isNotEmpty() }

android {
    namespace = "com.voidcord.mobile"
    compileSdk = libs.versions.compileSdk.get().toInt()
    ndkVersion = "28.2.13676358"

    defaultConfig {
        applicationId = "com.voidcord.mobile"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = codeVersion
        versionName = versionVoidcord

        ndk { abiFilters.addAll(architectures) }

        externalNativeBuild {
            cmake {
                arguments(
                    "-DNODE_MOBILE_DIR=${nodeMobile.absolutePath.replace('\\', '/')}",
                    "-DANDROID_STL=c++_shared",
                )
                cppFlags("-std=c++17", "-fexceptions", "-frtti")
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.31.6"
        }
    }

    /* `libnode.so` est prise telle quelle, à côté de la petite bibliothèque de liaison. */
    sourceSets.named("main") {
        jniLibs.srcDirs(File(nodeMobile, "bin"))
        kotlin.srcDirs("src/main/kotlin")
    }

    /*
     * Un APK par architecture. L'archive de nodejs-mobile fait soixante mégaoctets par
     * architecture : réunies dans un seul fichier, elles donnent un APK que Bloom ne
     * pourrait pas envoyer sur GitHub.
     */
    splits {
        abi {
            isEnable = architectures.size > 1
            reset()
            include(*architectures.toTypedArray())
            isUniversalApk = false
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            /*
             * R8 ne touche pas au serveur, qui est du JavaScript : il ne reste que
             * quelques classes Kotlin, et les réduire ferait perdre les méthodes appelées
             * depuis la page par `@JavascriptInterface`.
             */
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    /*
     * Node charge ses propres modules natifs et doit pouvoir lire `libnode.so` comme un
     * fichier : elle doit donc être extraite de l'APK à l'installation.
     */
    packaging {
        jniLibs {
            useLegacyPackaging = true
            /* Deux copies de la bibliothèque standard C++ feraient échouer l'empaquetage. */
            pickFirsts += listOf("**/libc++_shared.so")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.toVersion(libs.versions.javaVersion.get())
        targetCompatibility = JavaVersion.toVersion(libs.versions.javaVersion.get())
    }

    buildFeatures {
        buildConfig = true
    }
}

kotlin {
    jvmToolchain(libs.versions.javaVersion.get().toInt())
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.webkit)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.okhttp)
}

/* Le rappel, avant que CMake ne cherche des en-têtes qui ne sont pas là. */
tasks.configureEach {
    if (name.startsWith("externalNativeBuild") || name.startsWith("configureCMake")) {
        doFirst {
            if (!File(nodeMobile, "include/node/node.h").exists()) {
                throw GradleException(
                    "Node.js pour Android est absent. Lance d'abord, à la racine du dépôt :\n" +
                        "    node scripts/fetchNodeMobile.mjs",
                )
            }
        }
    }
}

/*
 * Le serveur embarqué doit exister avant l'empaquetage : sans lui, l'APK s'installe et
 * l'application reste sur l'animation de démarrage, sans rien dire.
 */
tasks.register("verifierServeur") {
    doLast {
        val serveur = File(projectDir, "src/main/assets/nodejs-project/main.js")
        if (!serveur.exists()) {
            throw GradleException(
                "Le serveur Voidcord n'est pas compilé. Lance d'abord, à la racine du dépôt :\n" +
                    "    npm run build:mobile",
            )
        }
    }
}

tasks.configureEach {
    if (name.startsWith("merge") && name.endsWith("Assets")) dependsOn("verifierServeur")
}
