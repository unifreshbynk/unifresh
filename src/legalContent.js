/** Découpe un bloc en paragraphes (séparateur double saut de ligne). */
function P(text) {
  return text.trim();
}

export const LEGAL_MENTIONS = {
  title: "Mentions légales",
  lastUpdated: "21 mai 2026",
  preamble: P(`
Le présent document constitue l'intégralité des mentions légales applicables au site internet exploité sous la dénomination commerciale « UniFresh », ci-après dénommé indiffément le « Site », l'« Interface », la « Plateforme » ou le « Service en ligne ». L'accès, la consultation, la navigation, l'inscription, la création de compte, la soumission de formulaires, l'utilisation des fonctionnalités interactives, y compris mais sans s'y limiter les modules de demande de prestations, de gestion de créneaux, d'authentification par code à usage unique transmis par courrier électronique, ainsi que toute interaction directe ou indirecte avec le Site, emporte acceptation pleine, entière, irrévocable et sans réserve des présentes mentions légales, dans leur version en vigueur au jour de la consultation, sous réserve des éventuelles modifications ultérieures publiées sur le Site sans obligation de notification individuelle préalable, sauf disposition impérative contraire du droit suisse applicable.
`),
  sections: [
    {
      heading: "Article 1 — Identification de l'éditeur et statut juridique",
      body: P(`
Conformément aux exigences en matière de transparence et d'identification des prestataires de services de la société de l'information, l'éditeur du Site est l'entité ou la personne physique agissant sous la marque « UniFresh », spécialisée dans la mise en relation, l'organisation, la coordination et le suivi administratif de prestations de nettoyage à destination des particuliers, des entreprises et des étudiant·es susceptibles d'intervenir en qualité de prestataires ou de partenaires, selon les modalités décrites sur le Site et dans les échanges contractuels ultérieurs.

L'éditeur peut être joint pour toute question relative au Site, à l'exercice des droits des personnes concernées, aux réclamations précontractuelles ou postcontractuelles, aux demandes d'accès, de rectification, d'effacement, de limitation ou d'opposition au traitement des données, ainsi qu'à toute correspondance d'ordre juridique, commercial ou technique, à l'adresse électronique suivante : unifreshbynk@gmail.com, sous réserve des délais de traitement raisonnables compte tenu du volume de sollicitations et de la nature de la demande.

Sauf mention contraire expresse, UniFresh n'est pas tenue de fournir sur le Site l'ensemble des informations sociétaires détaillées lorsque celles-ci ne sont pas encore consolidées dans un registre public accessible ; l'utilisateur est invité à formuler toute demande d'identification complémentaire par écrit. En l'absence de précision, les références à « nous », « notre », « nos » ou « l'équipe UniFresh » désignent l'éditeur du Site et, le cas échéant, ses mandataires, sous-traitants et partenaires dûment habilités.
`),
    },
    {
      heading: "Article 2 — Objet du Site et description des services",
      body: P(`
Le Site a pour objet principal de présenter l'activité de UniFresh, de permettre la collecte structurée d'informations nécessaires à l'étude des besoins des utilisateurs, de faciliter la prise de contact, l'envoi de demandes de devis personnalisés, la gestion des inscriptions selon les profils proposés (étudiant·e, entreprise, particulier), ainsi que la transmission sécurisée, dans la mesure du possible, de certaines données via des mécanismes techniques décrits dans la politique de confidentialité.

UniFresh agit, sauf stipulation contractuelle écrite distincte conclue postérieurement à l'utilisation du Site, en qualité d'intermédiaire organisationnel et non en qualité d'employeur direct de l'ensemble des intervenants susceptibles d'effectuer les prestations sur le terrain. Les conditions financières, les périmètres d'intervention, les normes d'hygiène, les produits utilisés, les assurances applicables et les responsabilités respectives des parties sont déterminées, le cas échéant, dans un devis, un bon de commande, un contrat-cadre ou tout autre document signé ou validé expressément entre les parties, prévalant sur toute information générale, indicative ou marketing présente sur le Site.

Les informations, fourchettes tarifaires, mentions « tarif réduit » ou « tarif normal », exemples de surfaces en mètres carrés, descriptions de types de logements (appartement, maison, location de courte durée, etc.), indications relatives à la fourniture ou non de produits de nettoyage par le client, ainsi que tout contenu d'aide en ligne, ont une valeur strictement informative et ne sauraient constituer une offre ferme, une promesse de résultat, une garantie de disponibilité immédiate ni un engagement de prix définitif sans confirmation écrite ultérieure.
`),
    },
    {
      heading: "Article 3 — Conditions d'accès et d'utilisation",
      body: P(`
L'accès au Site est en principe ouvert à tout utilisateur disposant d'un équipement terminal compatible, d'un logiciel de navigation à jour et d'une connexion internet. Certains modules, notamment l'espace personnel après inscription, la soumission de demandes de service pour les profils entreprise et particulier, ou l'interface d'administration réservée, peuvent être soumis à des conditions d'authentification, à des codes d'accès, à des limitations techniques ou à des restrictions géographiques liées à la zone d'intervention annoncée sur le Site.

L'utilisateur s'engage à fournir des informations exactes, complètes, loyales et mises à jour, et à ne pas usurper l'identité d'un tiers, créer de faux comptes, soumettre des demandes manifestement abusives, utiliser des scripts automatisés de manière déloyale, tenter d'altérer le fonctionnement du Site, d'accéder sans autorisation à des zones restreintes, de contourner les dispositifs de limitation d'envoi de codes de vérification, ou d'exercer toute activité susceptible de porter atteinte aux droits de UniFresh, des autres utilisateurs ou de tiers.

UniFresh se réserve le droit, à tout moment et sans préavis, de suspendre, restreindre ou supprimer l'accès d'un utilisateur en cas de violation des présentes mentions, de comportement frauduleux, de non-respect des lois applicables, de sollicitations répétées sans fondement, ou pour des raisons de maintenance, de sécurité, de mise en conformité réglementaire ou de force majeure, sans que cette décision n'ouvre droit à indemnité, sauf disposition impérative contraire.
`),
    },
    {
      heading: "Article 4 — Propriété intellectuelle et droits d'auteur",
      body: P(`
L'ensemble des éléments composant le Site, notamment et sans limitation : la structure générale, l'arborescence, les chartes graphiques, les logos, les dénominations, les textes, les photographies, les illustrations, les icônes, les bases de données, les logiciels, les codes source et objet, les algorithmes, les interfaces, les formulaires, les libellés, les traductions, les compilations de données et tout autre contenu original ou licencié, est protégé par le droit d'auteur, le droit des marques, le droit suisse des dessins et modèles, ainsi que, le cas échéant, par les conventions internationales applicables en Suisse.

Toute reproduction, représentation, modification, adaptation, traduction, extraction, réutilisation, commercialisation, distribution, mise à disposition du public, totale ou partielle, par quelque procédé que ce soit, sans l'autorisation écrite préalable et expresse de UniFresh ou de ses ayants droit, est strictement interdite et susceptible d'engager la responsabilité civile et pénale de son auteur. Les marques et logos de tiers mentionnés sur le Site le sont à titre informatif et demeurent la propriété de leurs titulaires respectifs.

Une autorisation limitée, non exclusive, non transférable et révocable est accordée à l'utilisateur pour accéder au Site et l'utiliser aux seules fins pour lesquelles il a été conçu, sans droit de créer des œuvres dérivées, d'effectuer de l'ingénierie inverse à des fins illicites, ou d'utiliser des dispositifs de capture systématique de contenu à des fins commerciales non autorisées.
`),
    },
    {
      heading: "Article 5 — Hébergement, disponibilité et maintenance",
      body: P(`
Le Site est hébergé auprès d'un prestataire d'infrastructure choisi par UniFresh, dont l'identité complète (raison sociale, adresse, contact) peut être communiquée sur demande écrite motivée conformément au droit applicable. UniFresh s'efforce d'assurer une disponibilité continue du Site, mais ne garantit pas un fonctionnement ininterrompu, exempt d'erreurs, de virus, de failles de sécurité, de latence, de pertes de données ou d'incompatibilités avec l'ensemble des terminaux, navigateurs, systèmes d'exploitation et configurations réseau existants ou futurs.

Des opérations de maintenance corrective, préventive ou évolutive peuvent entraîner des interruptions temporaires, des modifications de l'ergonomie, des ajouts ou suppressions de fonctionnalités, des migrations de données ou des changements d'architecture technique, y compris le passage d'un stockage local navigateur à un stockage serveur ou inversement, sans que ces opérations n'engagent la responsabilité de UniFresh au-delà des obligations légales impératives.

L'utilisateur est seul responsable de la sauvegarde, sur ses propres équipements, de toute information qu'il juge importante et qu'il aurait saisie sur le Site, étant entendu que certaines données peuvent être stockées sur le serveur de UniFresh selon les paramètres techniques en vigueur au moment de l'utilisation, comme décrit dans la politique de confidentialité.
`),
    },
    {
      heading: "Article 6 — Liens hypertextes et contenus tiers",
      body: P(`
Le Site peut contenir, à titre ponctuel ou permanent, des liens hypertextes pointant vers des ressources externes (sites de partenaires, autorités, fournisseurs de polices web, services de messagerie, etc.). UniFresh n'exerce aucun contrôle sur le contenu, les politiques de confidentialité, les pratiques de sécurité ou la disponibilité de ces ressources tierces et décline toute responsabilité quant aux dommages directs ou indirects résultant de leur consultation ou de leur utilisation.

La mise en place d'un lien vers le Site depuis un site tiers est soumise au respect du droit applicable, de l'ordre public et des présentes mentions ; UniFresh se réserve le droit de demander la suppression de tout lien qu'elle estimerait non conforme, trompeur, préjudiciable à son image ou portant atteinte à ses droits, sans préjudice des voies de droit ouvertes.
`),
    },
    {
      heading: "Article 7 — Limitation de responsabilité",
      body: P(`
Dans les limites autorisées par le droit suisse impératif, UniFresh décline toute responsabilité pour les dommages indirects, accessoires, spéciaux, consécutifs ou immatériels, notamment perte de profit, perte de chance, perte de données, atteinte à l'image, interruption d'activité, coûts de substitution ou préjudice moral, résultant de l'utilisation ou de l'impossibilité d'utiliser le Site, même si UniFresh a été informée de la possibilité de tels dommages.

La responsabilité de UniFresh, lorsqu'elle est légalement engagée, est en tout état de cause limitée au montant effectivement payé par le client concerné à UniFresh au titre de la prestation litigieuse sur les douze (12) mois précédant le fait générateur, ou, à défaut de paiement, à un montant forfaitaire symbolique conforme au droit applicable, le plus élevé des deux plafonds étant retenu lorsque pertinent.

UniFresh ne garantit pas que les prestations de nettoyage effectuées par des tiers ou des partenaires répondront à des attentes subjectives de perfection esthétique ; les réclamations relatives à l'exécution matérielle des prestations doivent être adressées selon les voies contractuelles convenues postérieurement à la validation du devis, sous réserve des garanties légales non exclues.
`),
    },
    {
      heading: "Article 8 — Droit applicable et for juridique",
      body: P(`
Les présentes mentions légales sont régies par le droit suisse, à l'exclusion de ses règles de conflit de lois et de la Convention de Vienne sur la vente internationale de marchandises. Tout litige relatif à l'interprétation, la validité, l'exécution ou la résiliation des relations juridiques découlant de l'utilisation du Site sera soumis, à défaut de règlement amiable préalable obligatoire non limitatif, à la compétence exclusive des tribunaux du canton où UniFresh a son siège ou son domicile effectif, sous réserve d'un forum impératif contraire au bénéfice du consommateur lorsque applicable.

Si une disposition des présentes mentions était déclarée nulle, inapplicable ou inopposable, les autres dispositions conserveraient leur pleine force et portée, et la disposition invalide serait remplacée par une disposition valide se rapprochant le plus possible de l'intention économique initiale des parties.
`),
    },
    {
      heading: "Article 9 — Dispositions diverses",
      body: P(`
Le fait pour UniFresh de ne pas se prévaloir d'un manquement de l'utilisateur à l'une quelconque des obligations des présentes ne saurait être interprété comme une renonciation à s'en prévaloir ultérieurement. Les titres des articles sont insérés pour la seule commodité de lecture et ne modifient pas l'interprétation des clauses.

Les présentes mentions légales peuvent être complétées par des conditions générales de vente, des conditions générales d'utilisation spécifiques, des politiques sectorielles ou des avenants contractuels transmis lors de l'acceptation d'un devis ; en cas de contradiction manifeste entre un document contractuel signé et le contenu général du Site, le document contractuel signé prévaut pour les parties liées.

Pour toute question relative aux présentes mentions légales, veuillez contacter : unifreshbynk@gmail.com. Dernière mise à jour indicative : 21 mai 2026.
`),
    },
  ],
};

export const LEGAL_PRIVACY = {
  title: "Politique de confidentialité",
  lastUpdated: "21 mai 2026",
  preamble: P(`
La présente politique de confidentialité (ci-après la « Politique ») décrit, de manière détaillée, exhaustive et structurée, la manière dont UniFresh (ci-après « nous », « notre » ou le « Responsable du traitement » au sens de la loi fédérale suisse sur la protection des données, la LPD, dans sa version en vigueur, et de son ordonnance d'application, la nLPD, lorsque applicable) collecte, utilise, conserve, sécurise, communique, transfère le cas échéant et protège les données à caractère personnel des utilisateurs du site internet UniFresh (le « Site »), qu'ils agissent en qualité de visiteurs, d'utilisateurs inscrits, de clients particuliers ou professionnels, d'étudiant·es partenaires ou d'administrateurs habilités.

En utilisant le Site, en cochant la case d'acceptation lors de l'inscription, en soumettant un formulaire, en demandant l'envoi d'un code de vérification par courrier électronique, en créant une demande de service ou en communiquant avec nous par tout canal connecté au Site, vous déclarez avoir pris connaissance de la présente Politique dans son intégralité. Si vous n'acceptez pas les termes ci-dessous, vous devez vous abstenir d'utiliser le Site et, le cas échéant, demander la suppression de votre compte selon les modalités prévues.
`),
  sections: [
    {
      heading: "Section I — Responsable du traitement et contact",
      body: P(`
Le responsable du traitement des données collectées via le Site est UniFresh, joignable à l'adresse : unifreshbynk@gmail.com. Pour toute question relative à la protection des données, à l'exercice de vos droits ou à l'introduction d'une réclamation, vous pouvez utiliser cette adresse en indiquant l'objet « Protection des données » et en précisant votre identité de manière suffisante pour nous permettre de traiter votre demande tout en évitant les divulgations non autorisées à des tiers.

Lorsque UniFresh fait appel à des sous-traitants (hébergeur, fournisseur de messagerie SMTP, prestataire technique), ceux-ci traitent les données uniquement sur instruction documentée du responsable du traitement, dans la mesure nécessaire à la fourniture de leurs services, et sont sélectionnés compte tenu de garanties appropriées au regard de la nature des données et des risques associés, sans que cette sélection n'impose une obligation de résultat absolu en matière de sécurité informatique.
`),
    },
    {
      heading: "Section II — Catégories de données traitées",
      body: P(`
Selon les interactions avec le Site, nous sommes susceptibles de traiter les catégories de données suivantes, de manière cumulative ou partielle :

Données d'identification et de contact : nom, prénom, raison sociale le cas échéant, adresse électronique, numéro de téléphone, adresse postale d'intervention ou de facturation lorsqu'elle est communiquée dans un formulaire de demande.

Données de profil et d'inscription : type de profil sélectionné (étudiant·e, entreprise, particulier), âge pour les profils étudiants, canton, nom d'établissement scolaire, date et heure d'inscription, historique de mise à jour du profil.

Données relatives aux demandes de service : superficie déclarée en mètres carrés, type de logement ou de locaux, niveau de salissure ou d'intensité de nettoyage déclaré, description libre des tâches, notes complémentaires, indication sur la disponibilité de produits de nettoyage sur place, créneaux horaires sélectionnés (soir en semaine, samedi, dimanche), mode de planification pour les entreprises (semaine ponctuelle ou récurrence), adresse détaillée du lieu d'intervention.

Données techniques et de journalisation : identifiants de session côté navigateur, jetons d'administration temporaires, horodatages, adresses IP susceptibles d'être traitées par l'hébergeur ou le serveur applicatif à des fins de sécurité et de limitation d'abus, logs d'erreurs, métadonnées relatives aux envois de codes de vérification.

Données de communication : contenu des courriels échangés, codes à usage unique à durée limitée, accusés de réception implicites liés aux serveurs de messagerie.

Nous ne cherchons pas à collecter délibérément des données sensibles au sens de la LPD (données sur la santé, opinions politiques, etc.) via les champs libres ; toutefois, si vous mentionnez spontanément de telles informations dans une zone de texte libre, vous en assumez la responsabilité et nous vous invitons à limiter vos saisies au strict nécessaire.
`),
    },
    {
      heading: "Section III — Finalités et bases légales du traitement",
      body: P(`
Vos données sont traitées pour les finalités suivantes, chacune reposant sur une base légale appropriée au sens du droit suisse :

Gestion des comptes et authentification : création de compte, vérification de l'adresse e-mail par code temporaire, connexion sécurisée, prévention des accès non autorisés — bases : exécution de mesures précontractuelles à votre demande, intérêt légitime à sécuriser le Site.

Traitement des demandes et relation client : étude des besoins, établissement de devis, planification des interventions, suivi commercial, facturation le cas échéant — bases : exécution du contrat ou de mesures précontractuelles, intérêt légitime au développement de l'activité.

Communication opérationnelle : envoi de codes, confirmations de réception de demande, notifications internes à l'équipe UniFresh — bases : exécution du service demandé, intérêt légitime à assurer la traçabilité.

Sécurité et prévention des abus : limitation du nombre d'envois de codes, journalisation, détection de comportements anormaux — bases : intérêt légitime impérieux à protéger le Site et les utilisateurs.

Respect des obligations légales : conservation de preuves, réponses aux autorités compétentes lorsque la loi l'exige — base : obligation légale.

Amélioration du Site et statistiques internes agrégées : analyse d'usage sous forme agrégée ou pseudonymisée lorsque applicable — base : intérêt légitime, sous réserve de vos droits d'opposition lorsque requis.

Lorsque le traitement repose sur votre consentement (notamment la case d'acceptation de la présente Politique à l'inscription), vous pouvez le retirer à tout moment sans affecter la licéité des traitements antérieurs, étant entendu que certaines fonctionnalités pourront devenir indisponibles sans traitement des données strictement nécessaires.
`),
    },
    {
      heading: "Section IV — Destinataires et communication des données",
      body: P(`
Les données peuvent être communiquées aux catégories de destinataires suivantes, strictement dans la mesure nécessaire :

Personnel et mandataires de UniFresh habilités sur la base du besoin d'en connaître.

Prestataires techniques agissant en qualité de sous-traitants : hébergement du Site et de la base de données applicative, service d'envoi de courriels (SMTP), éventuels outils de maintenance.

Partenaires ou étudiant·es intervenants, uniquement pour l'organisation des prestations convenues après validation contractuelle, et dans la limite des informations utiles à l'intervention.

Autorités administratives ou judiciaires, lorsque la loi l'impose ou en réponse à une décision exécutoire.

Nous ne vendons pas vos données personnelles à des tiers à des fins de marketing tiers. Nous n'autorisons pas non plus, sauf mention contraire future explicitement consentie, le profilage à des fins publicitaires intrusives sur le Site dans sa version actuelle.

En cas de transfert de données à l'étranger (par exemple si l'hébergeur ou le fournisseur de messagerie dispose de serveurs hors de Suisse), nous veillons à ce que des garanties appropriées soient mises en place conformément à la LPD, telles que clauses contractuelles types, décisions d'adéquation reconnues ou mesures techniques et organisationnelles complémentaires.
`),
    },
    {
      heading: "Section V — Durées de conservation",
      body: P(`
Les données sont conservées pendant des durées proportionnées aux finalités poursuivies :

Données de compte actif : pendant la durée de la relation, puis archivage limité en cas de suppression de compte initiée par l'utilisateur ou par UniFresh.

Demandes de service et inscriptions : conservation pendant la durée nécessaire au suivi commercial, à la prescription des éventuels litiges et aux obligations comptables, en principe jusqu'à dix (10) ans pour les pièces comptables lorsque applicable, et durée moindre pour les journaux techniques sauf obligation contraire.

Codes de vérification : quelques minutes à dix (10) minutes maximum après émission, puis suppression ou invalidation automatique.

Jetons d'administration : durée configurée (par défaut une heure), puis expiration et purge.

Les critères de détermination incluent la nature des données, la sensibilité, les risques, les finalités et les exigences légales. À l'issue des délais, les données sont supprimées, anonymisées de manière irréversible ou agrégées de sorte qu'elles ne permettent plus l'identification des personnes concernées.
`),
    },
    {
      heading: "Section VI — Sécurité des données",
      body: P(`
Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables compte tenu de l'état de l'art, des coûts de mise en œuvre, de la nature des données et des risques, incluant notamment : utilisation de HTTPS en environnement de production, restriction d'accès à l'interface d'administration par code et jeton temporaire, stockage serveur des demandes, limitation du taux d'envoi des codes par adresse IP, mots de passe d'application pour les services de messagerie, sauvegardes recommandées du fichier de données serveur.

Aucune méthode de transmission ou de stockage n'étant totalement sécurisée, nous ne pouvons garantir une sécurité absolue. En cas de violation de données présentant un risque élevé pour vos droits et libertés, nous informerons les autorités compétentes et, lorsque requis, les personnes concernées, conformément à la LPD.

Vous êtes responsable de la confidentialité des codes reçus par e-mail, de la sécurité de votre boîte de réception et de votre appareil, et de la déconnexion de votre session sur un terminal partagé.
`),
    },
    {
      heading: "Section VII — Vos droits",
      body: P(`
Conformément à la LPD et, le cas échéant, au Règlement (UE) 2016/679 pour les personnes concernées situées dans l'Union européenne lorsque le Règlement est applicable, vous disposez notamment des droits suivants, sous réserve des limitations légales :

Droit d'accès : obtenir la confirmation que des données vous concernant sont traitées et en recevoir une copie intelligible.

Droit de rectification : faire corriger des données inexactes ou compléter des données incomplètes.

Droit à l'effacement (« droit à l'oubli ») : demander la suppression lorsque les conditions légales sont remplies, notamment via la fonction de suppression de compte sur le Site, complétée par une demande écrite si nécessaire.

Droit à la limitation du traitement : dans les hypothèses prévues par la loi.

Droit d'opposition : vous opposer à certains traitements fondés sur l'intérêt légitime, motivé par votre situation particulière.

Droit à la portabilité : recevoir certaines données dans un format structuré lorsque le traitement est automatisé et fondé sur le consentement ou le contrat.

Retrait du consentement : à tout moment pour les traitements qui en dépendent.

Pour exercer vos droits, adressez une demande à unifreshbynk@gmail.com en joignant tout élément permettant de vérifier votre identité. Nous répondrons dans un délai raisonnable, en principe dans un délai d'un (1) mois, prolongeable lorsque la complexité l'exige, conformément au droit applicable.

Vous avez également le droit d'introduire une plainte auprès du Préposé fédéral à la protection des données et à la transparence (PFPDT), Feldeggweg 1, 3003 Berne, Suisse, ou de l'autorité de contrôle de votre pays de résidence habituelle dans l'UE/EEE le cas échéant.
`),
    },
    {
      heading: "Section VIII — Cookies, stockage local et traceurs",
      body: P(`
Le Site utilise principalement le stockage local du navigateur (localStorage) pour mémoriser votre session, vos préférences d'affichage, le brouillon de formulaire, les jetons d'administration et certaines données de demandes en mode de compatibilité ou de secours lorsque le serveur est indisponible. Ces technologies ne sont pas des cookies au sens strict mais remplissent des fonctions similaires de persistance côté client.

Nous n'utilisons pas, dans la version actuelle décrite par la présente Politique, de cookies publicitaires tiers à des fins de reciblage massif. Des polices web peuvent être chargées depuis des serveurs Google Fonts, ce qui peut entraîner la communication de votre adresse IP au fournisseur ; vous pouvez limiter ce chargement via les paramètres de votre navigateur ou des extensions de blocage, au prix d'une dégradation esthétique éventuelle.

Vous pouvez effacer le stockage local via les paramètres de votre navigateur ; cette opération peut vous déconnecter et supprimer les brouillons non synchronisés avec le serveur.
`),
    },
    {
      heading: "Section IX — Mineurs",
      body: P(`
Le Site s'adresse principalement à un public majeur ou aux étudiant·es ayant atteint l'âge minimum requis lors de l'inscription (seize (16) ans selon le formulaire). Si vous êtes parent ou représentant légal et pensez qu'un mineur nous a transmis des données sans autorisation, contactez-nous afin que nous prenions les mesures appropriées de suppression ou de restriction.
`),
    },
    {
      heading: "Section X — Modifications de la Politique",
      body: P(`
Nous pouvons modifier la présente Politique à tout moment pour refléter l'évolution du Site, des technologies, de la réglementation ou de nos pratiques. La date de dernière mise à jour sera indiquée en tête du document. Nous vous encourageons à consulter régulièrement cette page ; l'utilisation continue du Site après publication des modifications vaut acceptation de la Politique révisée, sauf opposition de votre part consistant à cesser d'utiliser le Site et à demander la suppression de votre compte.

En cas de modification substantielle affectant des traitements fondés sur le consentement, nous pourrons solliciter un nouveau consentement lorsque requis par la loi.
`),
    },
    {
      heading: "Section XI — Dispositions finales",
      body: P(`
La présente Politique est rédigée en langue française. En cas de traduction, la version française prévaut en cas de divergence, sauf disposition impérative contraire.

Pour toute question non résolue par la présente Politique, vous pouvez nous contacter à : unifreshbynk@gmail.com.

En cochant la case d'acceptation lors de votre inscription, vous reconnaissez avoir lu l'intégralité de ce document, en comprendre la portée générale, et accepter le traitement de vos données personnelles dans les conditions ci-dessus décrites, y compris les traitements fondés sur l'intérêt légitime lorsque applicable et sans opposition de votre part dans les délais légaux.

Dernière mise à jour : 21 mai 2026.
`),
    },
  ],
};
