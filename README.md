# Clark
This is the new reposity for my chatbot Clark (before version 3.0 ChatPC).
Линк за достъп до чатбота: [https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/02/26/16/20250226164516-B7MKF0O8.json](https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/02/26/16/20250226164516-B7MKF0O8.json)

Clark е open-source чатбот, използващ най-модерните ИИ модели, създаден да бъде в помощ на учителя и учениците. До него може да се осъществява достъп и онлайн, и с приложение за Windows и Android.

Линк за достъп до изходния код на Windows версията: [https://minedusci-my.sharepoint.com/:f:/g/personal/ml02743288_edu_mon_bg/EioXxAIN-DxDqzoegACUiH8BUp0KMM5DdvTF9yy6FDjTdQ?e=Asry2u](https://minedusci-my.sharepoint.com/:f:/g/personal/ml02743288_edu_mon_bg/EioXxAIN-DxDqzoegACUiH8BUp0KMM5DdvTF9yy6FDjTdQ?e=Asry2u)

Линк за достъп до изходния код на Android версията: [https://minedusci-my.sharepoint.com/:f:/g/personal/ml02743288_edu_mon_bg/EvdfLIR3skxPl-hjIqQJgysBNy_bRgQyn7NV6LE2Bj44IQ?e=w9MvJ2](https://minedusci-my.sharepoint.com/:f:/g/personal/ml02743288_edu_mon_bg/EvdfLIR3skxPl-hjIqQJgysBNy_bRgQyn7NV6LE2Bj44IQ?e=w9MvJ2)

For correct working of the app project to compile and edit please enable Win32 long paths from the Local Policy Group Editor in Computer Configuration > Administrative Templates > System > Filesystem.

**If you are on Home edition of Windows you shouldn't have gpedit.msc, but you can download it without upgrading to Pro.**

Only with one simple command for CMD with admin rights:

```batch
FOR %F IN ("%SystemRoot%\servicing\Packages\Microsoft-Windows-GroupPolicy-ClientTools-Package~*.mum") DO (DISM /Online /NoRestart /Add-Package:"%F")
FOR %F IN ("%SystemRoot%\servicing\Packages\Microsoft-Windows-GroupPolicy-ClientExtensions-Package~*.mum") DO (DISM /Online /NoRestart /Add-Package:"%F")
```
