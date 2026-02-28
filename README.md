# Clark


Clark е open-source чатбот, използващ най-модерните ИИ модели, създаден да бъде в помощ на учителя и учениците. До него може да се осъществява достъп и онлайн, и с приложение за Windows и Android.

For correct working of the app project to compile and edit please enable Win32 long paths from the Local Policy Group Editor in Computer Configuration > Administrative Templates > System > Filesystem.

**If you are on Home edition of Windows you shouldn't have gpedit.msc, but you can download it without upgrading to Pro.**

Only with one simple command for CMD with admin rights:

```batch
FOR %F IN ("%SystemRoot%\servicing\Packages\Microsoft-Windows-GroupPolicy-ClientTools-Package~*.mum") DO (DISM /Online /NoRestart /Add-Package:"%F")
FOR %F IN ("%SystemRoot%\servicing\Packages\Microsoft-Windows-GroupPolicy-ClientExtensions-Package~*.mum") DO (DISM /Online /NoRestart /Add-Package:"%F")
```
If you want to run the chatbot in your Botpress Studio workspace you'll need these installed integrations.
<img width="323" height="482" alt="Requied AI integrations" src="Chatbot files\image-1.png" />
