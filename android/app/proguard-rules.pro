# Les méthodes appelées depuis la page par @JavascriptInterface n'ont aucun appelant
# visible en Kotlin : R8 les retirerait, et le client perdrait tous ses appels synchrones.
-keepclassmembers class com.voidcord.mobile.** {
    @android.webkit.JavascriptInterface <methods>;
}

# Les fonctions natives appelées depuis le C++ (JNI) : mêmes raisons.
-keepclasseswithmembernames class com.voidcord.mobile.NodeRuntime {
    native <methods>;
}
